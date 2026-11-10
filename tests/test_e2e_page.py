"""End-to-end tests: drive a built page in headless Chromium.

Run with:  pytest -m e2e   (needs: pip install playwright && playwright install chromium)
"""
import json
import sys
from pathlib import Path

import pytest

pw = pytest.importorskip("playwright.sync_api")
pytestmark = pytest.mark.e2e

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "skill" / "unfold" / "scripts"))
import unfold as story  # noqa: E402

PAGE = (ROOT / "examples" / "unfold" / "index.html").as_uri()
TEMPLATE = (ROOT / "skill" / "unfold" / "assets" / "template.html").as_uri()
SETTLE = 1700


@pytest.fixture(scope="module")
def browser():
    with pw.sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


def open_page(browser, url=PAGE, **ctx):
    c = browser.new_context(viewport={"width": 1400, "height": 860}, accept_downloads=True, **ctx)
    pg = c.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("console", lambda m: pg.errors.append(m.text) if m.type == "error" else None)
    pg.goto(url)
    pg.wait_for_timeout(1200)
    if pg.locator("#ss-about").is_visible():
        pg.click('[data-act="about-close"]')
        pg.wait_for_timeout(500)
    return c, pg


@pytest.fixture
def page(browser):
    c, pg = open_page(browser)
    yield pg
    c.close()


@pytest.fixture
def editor(browser):
    c, pg = open_page(browser, TEMPLATE)
    pg.click('[data-act="mode-edit"]')
    pg.wait_for_timeout(500)
    yield pg
    c.close()


def nodes(pg):
    return pg.locator("#ss-scene .node").count()


def crumbs(pg):
    el = pg.locator("#ss-crumbs")
    return el.inner_text() if el.is_visible() else ""


def data(pg):
    pg.wait_for_timeout(450)  # the draft is written after a short debounce
    return pg.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('unfold:')&&!k.startsWith('unfold:about:')))||'null')")


# ---------- viewing ----------

def test_loads_cleanly_with_roles_and_legend(page):
    # Given the example, when it loads, then the overview, its input/output badges and the legend show, with no errors
    assert page.locator("#ss-title").inner_text() == "Unfold"
    assert nodes(page) == 9
    assert page.locator("#ss-scene .node.role-input").count() == 2
    assert page.locator("#ss-scene .node.role-output").count() == 1
    assert "In" in page.locator("#ss-levelinfo .keys-inline").inner_text()
    assert page.errors == []


def test_hover_traces_upstream_and_downstream(page):
    # Given the overview, when hovering the scanner
    page.hover('.node[data-id="scanner"]')
    page.wait_for_timeout(200)
    lit = set(page.eval_on_selector_all("#ss-scene .node.lit", "els => els.map(e => e.dataset.id)"))
    # Then its source and everything downstream lights up, but not the unrelated request input
    assert {"codebase", "scanner", "claude", "diagram", "build", "page"} <= lit
    assert "request" not in lit and "template" not in lit


def test_zoom_into_process_level_and_back(page):
    # Given the overview, when a module is clicked
    page.click('.node[data-id="build"]')
    page.wait_for_timeout(SETTLE)
    # Then its process level shows, with the type under the breadcrumbs
    assert "unfold.py build" in crumbs(page)
    assert "Process" in page.locator("#ss-levelinfo").inner_text()
    assert page.locator('.node[data-id="errs"].t-diamond').count() == 1
    # When Escape is pressed, then we are back
    page.keyboard.press("Escape")
    page.wait_for_timeout(SETTLE)
    assert crumbs(page) == ""


def test_three_levels_deep_and_breadcrumb(page):
    page.click('.node[data-id="template"]'); page.wait_for_timeout(SETTLE)
    page.click('.node[data-id="editor"]'); page.wait_for_timeout(SETTLE)
    assert "Editor" in crumbs(page)
    page.click('[data-act="crumb"][data-arg="0"]'); page.wait_for_timeout(SETTLE * 2)
    assert crumbs(page) == ""


def test_leaf_click_shows_note_and_sources(page):
    page.click('.node[data-id="build"]'); page.wait_for_timeout(SETTLE)
    page.click('.node[data-id="embed"]')
    card = page.locator("#ss-card").inner_text()
    assert "Escapes" in card and "unfold.py:embed" in card


# ---------- editing ----------

def test_palette_click_adds_shape_and_types_label(editor):
    before = nodes(editor)
    editor.click('#ss-palette [data-shape="diamond"]')
    editor.keyboard.type("Ready?")
    editor.keyboard.press("Enter")
    assert nodes(editor) == before + 1
    assert editor.locator('#ss-scene .node.t-diamond', has_text="Ready?").count() == 1


def test_palette_drag_and_drop(editor):
    before = nodes(editor)
    b = editor.locator('#ss-palette [data-shape="cylinder"]').bounding_box()
    editor.mouse.move(b["x"] + 20, b["y"] + 19)
    editor.mouse.down()
    editor.mouse.move(700, 720, steps=8)
    editor.mouse.up()
    editor.keyboard.press("Enter")
    assert nodes(editor) == before + 1


def test_drag_port_to_empty_canvas_creates_linked_node_and_tab_chains(editor):
    n0, e0 = nodes(editor), editor.locator("#ss-scene .edge").count()
    editor.click('.node[data-id="db"]')
    p = editor.locator('.node[data-id="db"] .port[data-port="r"]').bounding_box()
    editor.mouse.move(p["x"] + 6, p["y"] + 6)
    editor.mouse.down()
    editor.mouse.move(p["x"] + 260, p["y"] + 40, steps=8)
    editor.mouse.up()
    editor.keyboard.type("Backup")
    editor.keyboard.press("Tab")
    editor.keyboard.type("Archive")
    editor.keyboard.press("Enter")
    assert nodes(editor) == n0 + 2 and editor.locator("#ss-scene .edge").count() == e0 + 2


def test_toolbar_changes_shape_colour_role_and_text(editor):
    editor.click('.node[data-id="db"]')
    editor.click('[data-act="pop"][data-arg="shape"]'); editor.click('[data-act="set-shape"][data-arg="hexagon"]')
    editor.click('[data-act="pop"][data-arg="color"]'); editor.click('[data-act="set-color"][data-arg="violet"]')
    editor.click('[data-act="pop"][data-arg="tags"]'); editor.click('[data-act="tag-toggle"][data-arg="output"]')
    editor.click('[data-act="bold"]')
    node = editor.locator('.node[data-id="db"]')
    assert "t-hexagon" in node.get_attribute("class") and "role-output" in node.get_attribute("class")
    d = data(editor)
    db = next(n for n in d["root"]["nodes"] if n["id"] == "db")
    assert db["color"] == "violet" and db["text"]["bold"] is True


def test_double_click_edits_text_inline(editor):
    editor.dblclick('.node[data-id="db"]')
    editor.keyboard.press("Control+a")
    editor.keyboard.type("Postgres")
    editor.keyboard.press("Enter")
    assert "Postgres" in editor.locator('.node[data-id="db"]').text_content()


def test_nest_selection_rewires_edges_and_marks_roles(editor):
    # Given two connected nodes selected
    editor.click('.node[data-id="api"]')
    editor.click('.node[data-id="db"]', modifiers=["Shift"])
    # When nested
    editor.click('[data-act="nest-sel"]')
    editor.keyboard.type("Backend")
    editor.keyboard.press("Enter")
    d = data(editor)
    root = d["root"]
    mod = next(n for n in root["nodes"] if n["label"] == "Backend")
    # Then one module replaces them, outside edges point at it, and inside the crossing nodes become In/Out
    assert {n["id"] for n in mod["children"]["nodes"]} == {"api", "db"}
    assert any(e["from"] == "req" and e["to"] == mod["id"] for e in root["edges"])
    inner = {n["id"]: n.get("role") for n in mod["children"]["nodes"]}
    assert inner["api"] in ("input", "output")
    # And Undo restores the original
    editor.keyboard.press("Control+z"); editor.keyboard.press("Control+z")
    assert editor.locator('.node[data-id="api"]').count() == 1


def test_unnest_expands_inner_diagram_in_place(editor):
    before = nodes(editor)
    editor.click('.node[data-id="api"]')
    editor.click('[data-act="pop"][data-arg="nest"]')
    editor.click('[data-act="unnest"]')
    assert nodes(editor) == before - 1 + 5


def test_group_marquee_and_tidy(editor):
    editor.mouse.move(150, 300)
    editor.mouse.down()
    editor.mouse.move(1300, 800, steps=10)
    editor.mouse.up()
    assert "selected" in editor.locator("#ss-ftb").inner_text()
    editor.keyboard.press("Control+g")
    editor.keyboard.type("Everything")
    editor.keyboard.press("Enter")
    editor.click('[data-act="tidy"]')
    assert editor.locator("#ss-scene .group").count() == 1


def test_delete_and_undo_redo(editor):
    before = nodes(editor)
    editor.click('.node[data-id="db"]')
    editor.keyboard.press("Delete")
    assert nodes(editor) == before - 1
    editor.keyboard.press("Control+z")
    assert nodes(editor) == before
    editor.keyboard.press("Control+Shift+z")
    assert nodes(editor) == before - 1


def test_create_inner_process_level_from_toolbar(editor):
    editor.click('.node[data-id="db"]')
    editor.click('[data-act="pop"][data-arg="nest"]')
    editor.click('[data-act="create-inner"][data-arg="process"]')
    editor.wait_for_timeout(SETTLE)
    assert "Database" in crumbs(editor)
    assert "Empty level" in editor.locator("#ss-empty").inner_text()


# ---------- persistence ----------

def test_export_contains_edits_and_validates(editor, tmp_path):
    editor.click('#ss-palette [data-shape="cloud"]')
    editor.keyboard.type("Payments API")
    editor.keyboard.press("Enter")
    editor.click('[data-act="export"]')
    with editor.expect_download() as dl:
        editor.click('[data-act="dl-html"]')
    out = tmp_path / "x.html"
    dl.value.save_as(out)
    d = story.extract(out.read_text(encoding="utf-8"))
    assert any(n["label"] == "Payments API" and n["shape"] == "cloud" for n in d["root"]["nodes"])
    assert story.validate(d).ok


def test_draft_survives_reload_and_can_be_discarded(editor):
    editor.click('#ss-palette [data-shape="rect"]')
    editor.keyboard.press("Enter")
    editor.wait_for_timeout(500)
    n = nodes(editor)
    editor.reload(); editor.wait_for_timeout(1200)
    assert nodes(editor) == n and "Restored" in editor.locator("#ss-toast").inner_text()
    editor.click('#ss-toast [data-act="discard-draft"]')
    assert nodes(editor) == n - 1


def test_phone_viewport_dark_mode(browser):
    c, pg = open_page(browser, color_scheme="dark")
    pg.set_viewport_size({"width": 390, "height": 800})
    pg.wait_for_timeout(400)
    assert nodes(pg) == 9 and pg.errors == []
    c.close()


# ---------- v0.3: level types, media, navigation, guidance ----------

def test_about_card_shows_summary_once(browser):
    c = browser.new_context(viewport={"width": 1400, "height": 860})
    pg = c.new_page(); pg.goto(PAGE); pg.wait_for_timeout(1200)
    about = pg.locator("#ss-about")
    assert about.is_visible() and "interactive map" in about.inner_text() and "Outline" in about.inner_text()
    pg.click('[data-act="about-close"]')
    pg.reload(); pg.wait_for_timeout(1200)
    assert not pg.locator("#ss-about").is_visible()
    pg.click('[data-act="about"]')
    assert pg.locator("#ss-about").is_visible()
    c.close()


def test_hover_shows_one_line_hint(page):
    page.hover('.node[data-id="peek"]')
    page.wait_for_timeout(700)
    tip = page.locator("#ss-hint")
    assert tip.is_visible() and tip.inner_text().startswith("Reads only the lines")


def test_sequence_level_draws_lifelines_and_ordered_messages(page):
    page.click('.node[data-id="request"]'); page.wait_for_timeout(SETTLE)
    assert "Sequence" in page.locator("#ss-levelinfo").inner_text()
    assert page.locator("#ss-scene .lifeline").count() == 7
    nums = page.eval_on_selector_all("#ss-scene .seqnum text", "els => els.map(e => +e.textContent)")
    assert nums == list(range(1, 13))
    ys = page.eval_on_selector_all("#ss-scene .edge.msg", "els => els.map(e => e.getBBox().y)")
    assert ys == sorted(ys)


def test_data_level_draws_tables_with_fields(page):
    page.click('.node[data-id="diagram"]'); page.wait_for_timeout(SETTLE)
    assert page.locator("#ss-scene .node.t-table").count() == 6
    assert page.locator('.node[data-id="Node"] .tb-field.key').first.text_content().startswith("id")


def test_state_level_has_initial_marker(page):
    page.click('.node[data-id="template"]'); page.wait_for_timeout(SETTLE)
    page.click('.node[data-id="modes"]'); page.wait_for_timeout(SETTLE)
    assert "State machine" in page.locator("#ss-levelinfo").inner_text()
    assert page.locator("#ss-scene .node.t-initial").count() == 1


def test_media_opens_in_viewer_and_escape_closes(page):
    page.click('.node[data-id="page"]')
    page.click('[data-act="view-media"]')
    page.wait_for_timeout(500)
    v = page.locator("#ss-viewer")
    assert v.is_visible() and v.locator("img").get_attribute("src").startswith("data:image/png;base64,")
    page.keyboard.press("Escape")
    assert not v.is_visible()


def test_back_button_wheel_out_and_browser_back(page):
    page.click('.node[data-id="claude"]'); page.wait_for_timeout(SETTLE)
    page.click("#ss-crumbs .crumb-back"); page.wait_for_timeout(SETTLE)
    assert crumbs(page) == ""
    page.click('.node[data-id="claude"]'); page.wait_for_timeout(SETTLE)
    page.mouse.move(700, 450)
    for _ in range(14):
        page.mouse.wheel(0, 240); page.wait_for_timeout(40)
    page.wait_for_timeout(SETTLE)
    assert crumbs(page) == ""
    page.click('.node[data-id="template"]'); page.wait_for_timeout(SETTLE)
    page.click('.node[data-id="editor"]'); page.wait_for_timeout(SETTLE)
    page.go_back(); page.wait_for_timeout(SETTLE)
    assert crumbs(page).replace("\n", " ").endswith("Engine template")


def test_editor_switches_level_type_and_reorders_messages(browser):
    c, pg = open_page(browser)
    pg.click('.node[data-id="request"]'); pg.wait_for_timeout(SETTLE)
    pg.click('[data-act="mode-edit"]'); pg.wait_for_timeout(500)
    first = pg.locator('#ss-scene .edge.msg[data-i="0"] .elabel text').text_content()
    pg.click('#ss-scene .edge.msg[data-i="0"] .hit', force=True)
    pg.click('[data-act="emove"][data-arg="1"]')
    assert pg.locator('#ss-scene .edge.msg[data-i="1"] .elabel text').text_content() == first
    pg.select_option('#ss-levelbar .type-sel', 'architecture'); pg.wait_for_timeout(500)
    assert pg.locator("#ss-scene .lifeline").count() == 0
    c.close()


def test_upload_media_to_image_node(editor, tmp_path):
    png = tmp_path / "shot.png"
    import base64
    png.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="))
    with editor.expect_file_chooser() as fc:
        editor.click('#ss-palette [data-shape="image"]')
    fc.value.set_files(str(png))
    editor.wait_for_timeout(400)
    img = editor.locator("#ss-scene .node.t-image image")
    assert img.count() == 1 and img.get_attribute("href").startswith("data:image/png")
    d = data(editor)
    assert any(n.get("shape") == "image" and n["label"] == "shot" for n in d["root"]["nodes"])

# ---------- colours, fills, theme and the level bar ----------

def resolved(pg, css_color):
    # the colour a CSS value resolves to, as the browser reports it (rgb(...))
    return pg.evaluate("c => { const d = document.createElement('div'); d.style.color = c; document.body.appendChild(d);"
                       " const v = getComputedStyle(d).color; d.remove(); return v; }", css_color)


def fill_of(pg, selector):
    return pg.eval_on_selector(selector, "e => getComputedStyle(e).fill")


def test_view_mode_has_no_bottom_bar_and_shows_the_level_under_the_breadcrumbs(page):
    # Given the example in view mode, when it loads, then there is no bottom bar,
    # and the level's type and caption sit under the breadcrumbs
    assert page.locator("#ss-levelbar").is_hidden()
    info = page.locator("#ss-levelinfo")
    assert info.is_visible() and "Architecture" in info.inner_text()
    # When a part is opened, then the inner level's type replaces it
    page.click('.node[data-id="build"]'); page.wait_for_timeout(SETTLE)
    assert page.locator("#ss-levelbar").is_hidden() and "Process" in info.inner_text()
    # When switching to edit mode, then the bottom bar is back with its level tools and the line is gone
    page.click('[data-act="mode-edit"]'); page.wait_for_timeout(300)
    assert page.locator("#ss-levelbar .type-sel").is_visible() and info.is_hidden()


def test_colour_popover_offers_ten_colours_and_a_fill_switch(editor):
    editor.click('.node[data-id="db"]')
    editor.click('[data-act="pop"][data-arg="color"]')
    assert editor.locator('[data-act="set-color"]').count() == 10
    assert editor.locator('[data-act="set-fill"]').count() == 2


def test_solid_fill_paints_the_exact_colour_with_readable_text(editor):
    # Given a node, when it is set to red with a solid fill
    editor.click('.node[data-id="db"]')
    editor.click('[data-act="pop"][data-arg="color"]')
    editor.click('[data-act="set-color"][data-arg="red"]')
    editor.click('[data-act="pop"][data-arg="color"]')
    editor.click('[data-act="set-fill"][data-arg="solid"]')
    # Then the shape is filled with exactly the palette red, the label turns white, and the data records it
    sh = '.node[data-id="db"] .body .sh'
    assert fill_of(editor, sh) == resolved(editor, "var(--c-red)")
    assert fill_of(editor, '.node[data-id="db"] .lbl') == "rgb(255, 255, 255)"
    db = next(n for n in data(editor)["root"]["nodes"] if n["id"] == "db")
    assert db["color"] == "red" and db["fill"] == "solid"
    # When switched back to tint, then the field is removed and the fill is a light tint again
    editor.click('[data-act="set-fill"][data-arg="tint"]')
    db = next(n for n in data(editor)["root"]["nodes"] if n["id"] == "db")
    assert "fill" not in db and fill_of(editor, sh) != resolved(editor, "var(--c-red)")


@pytest.mark.parametrize("hex_color,text", [("#F5D90A", "rgb(18, 25, 35)"), ("#1A7F37", "rgb(255, 255, 255)")])
def test_solid_hex_colour_gets_contrasting_text(browser, tmp_path, hex_color, text):
    # Given a page whose node has a solid hex colour, when it renders, then the fill is that colour
    # and the label takes whichever of near-black or white reads better on it
    d = json.loads((ROOT / "engine" / "sample.json").read_text())
    n0 = d["root"]["nodes"][0]
    n0["color"], n0["fill"] = hex_color, "solid"
    out = tmp_path / "solid.html"
    out.write_text(story.embed(d, (ROOT / "skill" / "unfold" / "assets" / "template.html").read_text()), encoding="utf-8")
    c, pg = open_page(browser, out.as_uri())
    sel = f'.node[data-id="{n0["id"]}"]'
    assert fill_of(pg, sel + " .body .sh") == resolved(pg, hex_color)
    assert fill_of(pg, sel + " .lbl") == text
    c.close()


def test_theme_button_cycles_auto_light_dark_and_is_remembered(browser):
    # Given a viewer whose system prefers light, when they press the theme button twice, then the page is dark
    c, pg = open_page(browser, color_scheme="light")
    root_theme = lambda: pg.evaluate("document.documentElement.getAttribute('data-theme')")
    assert root_theme() is None
    pg.click('[data-act="theme"]'); assert root_theme() == "light"
    pg.click('[data-act="theme"]'); assert root_theme() == "dark"
    dark_paper = pg.evaluate("getComputedStyle(document.body).backgroundColor")
    assert dark_paper == "rgb(18, 25, 35)"
    # When the page is reloaded, then it stays dark
    pg.reload(); pg.wait_for_timeout(1000)
    assert root_theme() == "dark"
    # When pressed once more, then it follows the system again
    pg.click('[data-act="theme"]'); assert root_theme() is None
    assert pg.errors == []
    c.close()


def test_solid_fill_gets_an_ink_outline_and_the_outline_can_be_chosen(editor):
    # Given a node with a solid fill, when no outline is set, then its outline is the ink colour, not the fill colour
    editor.click('.node[data-id="db"]')
    editor.click('[data-act="pop"][data-arg="color"]')
    editor.click('[data-act="set-fill"][data-arg="solid"]')
    sh = '.node[data-id="db"] .body .sh'
    stroke = lambda: editor.eval_on_selector(sh, "e => getComputedStyle(e).stroke")
    assert stroke() == resolved(editor, "var(--ink)")
    # When the outline is set to amber, then it is amber and the data records it
    editor.click('[data-act="set-stroke"][data-arg="amber"]')
    assert stroke() == resolved(editor, "var(--c-amber)")
    db = next(n for n in data(editor)["root"]["nodes"] if n["id"] == "db")
    assert db["stroke"] == "amber"
    # When set back to automatic, then the field is removed
    editor.click('[data-act="set-stroke"][data-arg="auto"]')
    assert "stroke" not in next(n for n in data(editor)["root"]["nodes"] if n["id"] == "db")
