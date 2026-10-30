"""End-to-end tests for search, guided tours, presentation, quizzes, confidence, permalinks and map diffs (0.4.0).

Run with:  pytest -m e2e
"""
import json

import pytest

pw = pytest.importorskip("playwright.sync_api")
pytestmark = pytest.mark.e2e

from test_e2e_page import ROOT, browser, open_page, story, crumbs  # noqa: E402,F401

TEMPLATE_TEXT = (ROOT / "skill" / "unfold" / "assets" / "template.html").read_text(encoding="utf-8")
EXAMPLE = json.loads((ROOT / "examples" / "unfold" / "diagram.json").read_text())


def page_for(browser, tmp_path, d, name="p.html"):
    assert story.validate(d).ok, story.validate(d).errors
    f = tmp_path / name
    f.write_text(story.embed(d, TEMPLATE_TEXT), encoding="utf-8")
    return open_page(browser, f.as_uri())


def sample():
    return json.loads((ROOT / "engine" / "sample.json").read_text())


# ---------- search ----------

def test_search_finds_a_part_by_file_path_and_flies_to_it(browser):
    """Given a map, when I search a source file and press Enter, then the map opens the level that holds it."""
    c, pg = open_page(browser)
    pg.keyboard.press("/")
    pg.keyboard.type("scan_repo.py:manifests")
    pg.wait_for_timeout(150)
    assert pg.locator("#ss-sr li[data-k]").count() >= 1
    assert "Read manifests" in pg.locator("#ss-sr li[data-k]").first.inner_text()
    pg.keyboard.press("Enter")
    pg.wait_for_function("() => (document.querySelector('#ss-crumbs') || {}).textContent.includes('scan_repo.py')", timeout=5000)
    pg.locator("#ss-card").wait_for(state="visible", timeout=5000)
    c.close()


def test_search_shows_glossary_terms_and_closes_on_escape(browser):
    c, pg = open_page(browser)
    term = EXAMPLE["meta"]["glossary"][0]["term"]
    pg.click('[data-act="search"]')
    pg.keyboard.type(term[:4])
    pg.wait_for_timeout(150)
    assert pg.locator("#ss-sr .sr-gl").count() >= 1
    pg.keyboard.press("Escape")
    assert pg.locator("#ss-search").is_hidden()
    c.close()


# ---------- tours ----------

def test_auto_tour_walks_the_map_with_arrow_keys(browser):
    """Given a map without written tours, when I start the tour, then arrow keys step through generated steps."""
    c, pg = open_page(browser)
    pg.keyboard.press("t")
    pg.click('[data-act="tour-go"]')
    pg.wait_for_timeout(900)
    assert "1 /" in pg.locator("#ss-tour").inner_text()
    pg.keyboard.press("ArrowRight")
    pg.wait_for_timeout(1100)
    assert "2 /" in pg.locator("#ss-tour").inner_text()
    assert pg.locator("#ss-scene.spotlight .node.spot").count() == 1
    pg.keyboard.press("ArrowLeft")
    pg.wait_for_timeout(900)
    assert "1 /" in pg.locator("#ss-tour").inner_text()
    pg.keyboard.press("Escape")
    assert pg.locator("#ss-tour").is_hidden()
    c.close()


def tour_doc():
    d = sample()
    d["meta"]["intent"] = "learn"
    d["meta"]["summary"] = "A small web service."
    d["meta"]["tours"] = [{"title": "Request lifecycle", "steps": [
        {"title": "In", "node": "req", "text": "A request arrives."},
        {"title": "Inside the API", "path": ["api"], "text": "Validation comes first.", "notes": "Mention the 400 path."},
        {"title": "Where is data kept?", "quiz": {"q": "Which part stores data?", "answer": "db", "explain": "The database."}},
    ]}]
    return d


def test_written_tour_crosses_levels_and_quiz_checks_the_answer(browser, tmp_path):
    """Given a written tour with a quiz step, when the reader clicks the right part, then it says so."""
    c, pg = page_for(browser, tmp_path, tour_doc())
    pg.click('[data-act="tours"]')
    assert "Request lifecycle" in pg.locator(".tour-list").inner_text()
    assert "with questions" in pg.locator(".tour-list").inner_text()
    pg.click('[data-act="tour-go"]')
    pg.wait_for_timeout(900)
    pg.click('[data-act="tour-step"][data-arg="1"]')
    pg.wait_for_timeout(1600)
    assert crumbs(pg) != ""
    pg.click('[data-act="tour-step"][data-arg="1"]')
    pg.wait_for_timeout(1600)
    assert crumbs(pg) == ""
    assert "Click the part" in pg.locator("#ss-tour").inner_text()
    pg.click('.node[data-id="db"] .body', force=True)
    pg.wait_for_timeout(300)
    assert "Right." in pg.locator("#ss-tour").inner_text()
    assert pg.locator("#ss-card").is_hidden()
    c.close()


def test_learn_intent_offers_the_tour_on_first_visit(browser, tmp_path):
    d = tour_doc()
    f = tmp_path / "learn.html"
    f.write_text(story.embed(d, TEMPLATE_TEXT), encoding="utf-8")
    ctx = browser.new_context(viewport={"width": 1400, "height": 860})
    pg = ctx.new_page()
    pg.goto(f.as_uri())
    pg.wait_for_timeout(1200)
    assert pg.locator('#ss-about [data-act="tour-start"]').is_visible()
    pg.click('#ss-about [data-act="tour-start"]')
    pg.wait_for_timeout(900)
    assert pg.locator("#ss-tour").is_visible()
    ctx.close()


def test_presentation_hides_the_chrome_and_esc_ends_it(browser):
    c, pg = open_page(browser)
    pg.keyboard.press("p")
    pg.wait_for_timeout(900)
    assert pg.evaluate("document.body.classList.contains('presenting')")
    assert pg.locator("#ss-topbar").is_hidden() and pg.locator("#ss-levelbar").is_hidden()
    pg.keyboard.press(" ")
    pg.wait_for_timeout(900)
    assert "2 /" in pg.locator("#ss-tour").inner_text()
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    assert not pg.evaluate("document.body.classList.contains('presenting')")
    c.close()


def test_demonstrate_intent_offers_to_present(browser, tmp_path):
    d = sample()
    d["meta"]["intent"] = "demonstrate"
    c, pg = page_for(browser, tmp_path, d)
    assert pg.locator('#ss-toast [data-act="present"]').is_visible()
    c.close()


# ---------- confidence, permalinks, diff ----------

def test_sources_link_to_the_mapped_commit_and_inferred_parts_are_marked(browser, tmp_path):
    d = sample()
    d["meta"]["repo"] = {"url": "https://github.com/acme/shop", "commit": "abc1234"}
    leaf = d["root"]["nodes"][2]
    leaf.pop("children", None)
    leaf["source"] = ["src/db.py:10-24", "src/models.py:Order"]
    leaf["confidence"] = "inferred"
    leaf["note"] = "Stores orders."
    c, pg = page_for(browser, tmp_path, d)
    assert pg.locator(f'.node[data-id="{leaf["id"]}"] .conf').count() == 1
    pg.click(f'.node[data-id="{leaf["id"]}"] .body')
    pg.wait_for_timeout(300)
    hrefs = pg.eval_on_selector_all("#ss-card .src-link", "els => els.map(e => e.getAttribute('href'))")
    assert hrefs == ["https://github.com/acme/shop/blob/abc1234/src/db.py#L10-L24", "https://github.com/acme/shop/blob/abc1234/src/models.py"]
    assert "Inferred" in pg.locator("#ss-card").inner_text()
    c.close()


def test_map_diff_marks_added_removed_and_changed(browser, tmp_path):
    d = sample()
    ns = d["root"]["nodes"]
    ns[0]["diff"], ns[1]["diff"], ns[2]["diff"] = "added", "changed", "removed"
    d["root"]["edges"][0]["diff"] = "added"
    c, pg = page_for(browser, tmp_path, d)
    for k in ("added", "changed", "removed"):
        assert pg.locator(f"#ss-scene .node.diff-{k}").count() == 1
    assert pg.locator("#ss-scene .edge.diff-added").count() == 1
    assert "New" in pg.locator("#ss-levelbar").inner_text()
    c.close()


# ---------- presentation in a window (presentStyle "window") ----------

def test_window_presentation_keeps_the_overview_and_opens_the_part_in_a_window(browser, tmp_path):
    """Given presentStyle window, when I present and step to a part with an inner diagram, then the overview stays
    on screen under a dark scrim and a smaller window shows that part."""
    d = json.loads(json.dumps(EXAMPLE))
    d["meta"]["presentStyle"] = "window"
    d["meta"]["tours"] = [{"title": "T", "steps": [{"path": [], "title": "Overview"}, {"path": ["claude"], "title": "Inside Claude"}]}]
    c, pg = page_for(browser, tmp_path, d)
    pg.keyboard.press("p")
    pg.wait_for_timeout(1500)
    assert pg.locator("#ss-pwin").is_hidden()          # the first step is just the overview
    pg.keyboard.press("ArrowRight")
    pg.wait_for_timeout(1500)
    assert pg.locator("#ss-pwin").is_visible() and "Claude" in pg.inner_text("#ss-pwin .pw-head")
    assert pg.locator("#ss-pwin svg .node").count() >= 3                   # the inner diagram is drawn in the window
    assert pg.evaluate("document.querySelector('#ss-crumbs').hidden") is True   # and the map never left the overview
    assert float(pg.eval_on_selector("#ss-pscrim", "e => getComputedStyle(e).opacity")) > .95
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(600)
    assert pg.locator("#ss-pwin").is_hidden()
    assert not [e for e in pg.errors if "Failed to load resource" not in e]
    c.close()
