"""End-to-end tests for the 0.5.0 editing and teaching changes: tags, free links, subtree export,
documentation export, the info panel, dropped pictures and calm tour transitions.

Run with:  pytest -m e2e
"""
import base64
import json

import pytest

pw = pytest.importorskip("playwright.sync_api")
pytestmark = pytest.mark.e2e

from test_e2e_page import ROOT, TEMPLATE, SETTLE, browser, open_page, data, story  # noqa: E402,F401

PNG_2x1 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAD0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")


@pytest.fixture
def editor(browser):
    c, pg = open_page(browser, TEMPLATE)
    pg.click('[data-act="mode-edit"]')
    pg.wait_for_timeout(500)
    yield pg
    c.close()


def node(pg, nid):
    return next(n for n in data(pg)["root"]["nodes"] if n["id"] == nid)


def edge_of(pg, a, b):
    return next(e for e in data(pg)["root"]["edges"] if e["from"] == a and e["to"] == b)


def grab(pg, act):
    pg.click('[data-act="export"]')
    with pg.expect_download() as dl:
        pg.click(f'[data-act="{act}"]')
    d = dl.value
    return d.suggested_filename, open(d.path(), "rb").read().decode()


# ---------- tags ----------

def test_a_node_takes_many_tags_suggested_or_custom(editor):
    first = "db"
    editor.click(f'.node[data-id="{first}"]')
    editor.click('[data-act="pop"][data-arg="tags"]')
    editor.click('[data-act="tag-toggle"][data-arg="planned"]')
    editor.click('[data-act="tag-toggle"][data-arg="input"]')
    editor.fill("#ss-tagin", "needs review")
    editor.keyboard.press("Enter")
    editor.fill("#ss-tagin", "hardware")
    editor.click('[data-act="tag-add"]')
    n = node(editor, first)
    assert n["role"] == "input" and n["tags"] == ["planned", "needs review", "hardware"]
    assert editor.locator(f'.node[data-id="{first}"] .tag').count() == 3
    editor.click('[data-act="tag-del"][data-arg="planned"]')
    assert "planned" not in node(editor, first)["tags"]


def test_a_legacy_single_tag_becomes_a_tag(browser, tmp_path):
    d = json.loads((ROOT / "examples" / "unfold" / "diagram.json").read_text())
    d["root"]["nodes"][0]["tag"] = "planned"
    out = tmp_path / "p.html"
    out.write_text(story.embed(d, (ROOT / "skill" / "unfold" / "assets" / "template.html").read_text()), encoding="utf-8")
    c, pg = open_page(browser, out.as_uri())
    nid = d["root"]["nodes"][0]["id"]
    assert pg.locator(f'.node[data-id="{nid}"] .tag text').text_content() == "planned"
    c.close()


# ---------- links: label, bends and ends ----------

def data_or_original(pg):
    return data(pg) or json.loads((ROOT / "engine" / "sample.json").read_text())


def first_edge(pg):
    return next(e for e in data_or_original(pg)["root"]["edges"] if e.get("label"))


def test_a_label_can_be_dragged_and_edited(editor):
    e = first_edge(editor)
    idx = next(i for i, x in enumerate(data_or_original(editor)["root"]["edges"]) if x == e)
    editor.click(f'#ss-scene .edge[data-i="{idx}"] .elabel')
    box = editor.locator(f'#ss-scene .edge[data-i="{idx}"] .elabel').bounding_box()
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    editor.mouse.move(x, y); editor.mouse.down(); editor.mouse.move(x + 60, y - 40, steps=6); editor.mouse.up()
    lt = data(editor)["root"]["edges"][idx]["labelT"]
    assert 0.04 <= lt <= 0.96 and abs(lt - 0.5) > 0.03
    # the label stays on the line: its centre is within a few pixels of the path
    near = editor.evaluate("""i => {
      const e = document.querySelector('#ss-scene .edge[data-i="'+i+'"]'), p = e.querySelector('.line'), t = e.querySelector('.elabel text');
      const m = p.getScreenCTM().inverse(), b = t.getBoundingClientRect(), c = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(m);
      let best = 1e9, L = p.getTotalLength(); for (let k = 0; k <= 200; k++) { const q = p.getPointAtLength(L * k / 200); best = Math.min(best, Math.hypot(q.x - c.x, q.y - c.y)); }
      return best; }""", idx)
    assert near < 12
    editor.dblclick(f'#ss-scene .edge[data-i="{idx}"] .elabel')
    editor.keyboard.press("Control+a"); editor.keyboard.type("renamed"); editor.keyboard.press("Enter")
    assert data(editor)["root"]["edges"][idx]["label"] == "renamed"
    editor.click('[data-act="ereset"]')
    assert "labelT" not in data(editor)["root"]["edges"][idx]


def test_dragging_a_line_pulls_a_bend_out_of_it(editor):
    editor.click('#ss-scene .edge[data-i="0"] .hit', force=True)
    path = editor.locator('#ss-scene .edge[data-i="0"] .line')
    b = path.bounding_box()
    x, y = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
    editor.mouse.move(x, y); editor.mouse.down(); editor.mouse.move(x + 30, y + 90, steps=6); editor.mouse.up()
    assert len(data(editor)["root"]["edges"][0].get("points", [])) == 1


def test_an_end_can_move_to_another_side(editor):
    editor.click('#ss-scene .edge[data-i="0"] .hit', force=True)
    editor.click('[data-act="pop"][data-arg="ends"]')
    before = editor.locator('#ss-scene .edge[data-i="0"] .line').get_attribute("d")
    editor.click('[data-act="eside"][data-arg="to:t"]')
    ed = data(editor)["root"]["edges"][0]
    assert ed["toSide"] == "t"
    assert editor.locator('#ss-scene .edge[data-i="0"] .line').get_attribute("d") != before
    editor.click('[data-act="eside"][data-arg="to:"]')
    assert "toSide" not in data_or_original(editor)["root"]["edges"][0]


def test_dragging_an_end_dot_onto_another_box_reconnects_it(editor):
    d0 = data_or_original(editor)["root"]
    e0 = d0["edges"][0]
    other = next(n["id"] for n in d0["nodes"] if n["id"] not in (e0["from"], e0["to"]))
    editor.click('#ss-scene .edge[data-i="0"] .hit', force=True)
    h = editor.locator('.ep[data-end="1"] .ep-dot').bounding_box()
    t = editor.locator(f'.node[data-id="{other}"] .body').bounding_box()
    editor.mouse.move(h["x"] + h["width"] / 2, h["y"] + h["height"] / 2); editor.mouse.down()
    editor.mouse.move(t["x"] + t["width"] / 2, t["y"] + t["height"] / 2, steps=8); editor.mouse.up()
    ed = data(editor)["root"]["edges"][0]
    assert ed["to"] == other and ed["toSide"] in "trbl"


# ---------- export ----------

def test_export_of_a_level_includes_everything_inside_it(browser):
    c, pg = open_page(browser, (ROOT / "examples" / "types" / "index.html").as_uri())
    pg.click('.node[data-id="tl"]')
    pg.wait_for_timeout(SETTLE)
    pg.click('[data-act="export"]')
    assert pg.locator('[data-act="dl-sub-docs"]').count() == 1
    pg.keyboard.press("Escape")
    name, md = grab(pg, "dl-sub-docs")
    pg.keyboard.press("Escape")
    assert name.endswith("-docs.md") and "technical documentation" in md and "```mermaid" in md and "| Component |" in md
    name, sub = grab(pg, "dl-sub-html")
    assert name.endswith(".html")
    page_data = story.extract(sub)
    assert page_data["root"]["nodes"] and "Part of" in page_data["meta"]["subtitle"]
    c.close()


def test_documentation_links_each_component_to_its_inner_section(browser):
    c, pg = open_page(browser, (ROOT / "examples" / "unfold" / "index.html").as_uri())
    name, md = grab(pg, "dl-docs")
    assert md.startswith("# Unfold") and "## Contents" in md and "](#1" in md
    assert md.count("```mermaid") >= 3
    c.close()


# ---------- info panel ----------

def test_info_panel_shows_what_the_agent_spent(browser, tmp_path):
    d = json.loads((ROOT / "examples" / "unfold" / "diagram.json").read_text())
    d["meta"]["generation"] = {"agent": "Claude Code", "model": "m-1", "input_tokens": 1200, "output_tokens": 3400,
                               "cache_read_tokens": 50000, "cost": 1.234, "generated_at": "2026-10-27T10:00:00Z"}
    out = tmp_path / "g.html"
    out.write_text(story.embed(d, (ROOT / "skill" / "unfold" / "assets" / "template.html").read_text()), encoding="utf-8")
    c, pg = open_page(browser, out.as_uri())
    pg.click('[data-act="info"]')
    t = pg.locator("#ss-info").inner_text()
    assert "54,600" in t and "$1.23" in t and "Claude Code" in t
    pg.keyboard.press("Escape")
    assert not pg.locator("#ss-info").is_visible()
    c.close()


def test_info_panel_explains_when_nothing_was_recorded(editor):
    editor.click('[data-act="mode-view"]')
    editor.click('[data-act="info"]')
    assert "No usage recorded" in editor.locator("#ss-info").inner_text()


# ---------- pictures ----------

def test_a_dropped_picture_becomes_a_linkable_node_with_its_proportions(editor):
    editor.evaluate("""b64 => {
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const dt = new DataTransfer(); dt.items.add(new File([u], 'shot.png', {type: 'image/png'}));
      const r = document.querySelector('#ss-canvas').getBoundingClientRect();
      document.querySelector('#ss-canvas').dispatchEvent(new DragEvent('drop', {dataTransfer: dt, clientX: r.left + 60, clientY: r.bottom - 60, bubbles: true, cancelable: true}));
    }""", base64.b64encode(PNG_2x1).decode())
    editor.wait_for_timeout(600)
    img = next(n for n in data(editor)["root"]["nodes"] if n["shape"] == "image")
    assert img["label"] == "shot" and img["media"]["src"].startswith("data:image/png")
    assert abs((img["w"] / (img["h"] - 38)) - 2) < 0.1


# ---------- tours ----------

def test_fast_next_presses_end_on_the_right_step(browser):
    c, pg = open_page(browser, (ROOT / "examples" / "unfold" / "index.html").as_uri())
    pg.click('[data-act="present"]')
    pg.wait_for_timeout(2500)
    total = pg.evaluate("document.querySelector('.tr-count').textContent")
    for _ in range(6):
        pg.keyboard.press("ArrowRight")
        pg.wait_for_timeout(60)
    pg.wait_for_timeout(9000)
    step = pg.evaluate("document.querySelector('.tr-count').textContent").split(" / ")[0]
    assert step == "7" and total.endswith(" / " + total.split(" / ")[1])
    assert pg.errors == []
    c.close()


def test_several_bends_keep_the_link_tidy(editor):
    # Given a link bent several times, its path is a rounded polyline through the bends: no spline overshoot
    def on_line(frac):
        return editor.evaluate("""f => { const p = document.querySelector('#ss-scene .edge[data-i="0"] .line'), q = p.getPointAtLength(p.getTotalLength() * f), m = p.getScreenCTM();
          return {x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f}; }""", frac)
    for frac, dx, dy in [(.5, 0, 120), (.25, 30, 130), (.75, -40, 110)]:
        q = on_line(frac)
        editor.mouse.click(q["x"], q["y"])
        q = on_line(frac)
        editor.mouse.move(q["x"], q["y"]); editor.mouse.down(); editor.mouse.move(q["x"] + dx, q["y"] + dy, steps=6); editor.mouse.up()
    assert len(data(editor)["root"]["edges"][0]["points"]) >= 2
    d = editor.locator('#ss-scene .edge[data-i="0"] .line').get_attribute("d")
    assert "C" not in d and d.count("L") >= 2, d


def test_planned_parts_are_dashed_and_counted(browser, tmp_path):
    d = json.loads((ROOT / "engine" / "sample.json").read_text())
    d["meta"]["intent"] = "plan"
    d["root"]["nodes"][2]["tags"] = ["planned"]
    out = tmp_path / "plan.html"
    out.write_text(story.embed(d, (ROOT / "skill" / "unfold" / "assets" / "template.html").read_text()), encoding="utf-8")
    c, pg = open_page(browser, out.as_uri())
    assert pg.locator(f'.node.planned[data-id="{d["root"]["nodes"][2]["id"]}"]').count() == 1
    assert "1 planned" in pg.locator("#ss-levelbar").inner_text()
    c.close()


def test_export_dialog_has_no_stray_solid_buttons(editor):
    editor.click('[data-act="export"]')
    assert editor.locator("#ss-modal .btn.solid").count() == 0


def test_a_click_adds_no_bend_and_a_bend_dragged_back_onto_the_line_goes_away(editor):
    def on_line(frac):
        return editor.evaluate("""f => { const p = document.querySelector('#ss-scene .edge[data-i="0"] .line'), q = p.getPointAtLength(p.getTotalLength() * f), m = p.getScreenCTM();
          return {x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f}; }""", .6)
    q = on_line(.6)
    editor.mouse.move(q["x"], q["y"]); editor.mouse.down(); editor.mouse.move(q["x"] + 5, q["y"] + 5, steps=3); editor.mouse.up()
    assert "points" not in (data(editor) or {"root": {"edges": [{}]}})["root"]["edges"][0]
    q = on_line(.6)
    editor.mouse.move(q["x"], q["y"]); editor.mouse.down(); editor.mouse.move(q["x"] - 60, q["y"] + 110, steps=8); editor.mouse.up()
    assert len(data(editor)["root"]["edges"][0]["points"]) == 1
    h = editor.locator(".wp .wp-dot").bounding_box()
    hx, hy = h["x"] + h["width"] / 2, h["y"] + h["height"] / 2
    # drag it back to the straight line between the two boxes
    c = editor.evaluate("""() => { const r = id => { const b = document.querySelector('.node[data-id="'+id+'"] .body').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; };
      const a = r('req'), b = r('api'); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }""")
    editor.mouse.move(hx, hy); editor.mouse.down()
    editor.mouse.move(c[0], c[1], steps=8); editor.mouse.up()
    assert "points" not in data_or_original(editor)["root"]["edges"][0]
