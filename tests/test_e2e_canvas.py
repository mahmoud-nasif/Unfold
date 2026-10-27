"""End-to-end tests for linking, layout and routing, bend points and media (0.4.0).

Run with:  pytest -m e2e   (needs: pip install playwright && playwright install chromium)
"""
import base64
import json
from pathlib import Path

import pytest

pw = pytest.importorskip("playwright.sync_api")
pytestmark = pytest.mark.e2e

from test_e2e_page import ROOT, PAGE, TEMPLATE, browser, open_page, data, nodes, story  # noqa: E402,F401

FIXTURES = ROOT / "tests" / "fixtures" / "layout"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
TEMPLATE_TEXT = (ROOT / "skill" / "unfold" / "assets" / "template.html").read_text(encoding="utf-8")


@pytest.fixture
def mapped(browser):
    """The example map (this repository), in edit mode."""
    c, pg = open_page(browser)
    pg.click('[data-act="mode-edit"]')
    pg.wait_for_timeout(500)
    yield pg
    c.close()


def saved(pg):
    """The page's current data: the browser draft, or the original when edits returned it to that state."""
    return data(pg) or json.loads((ROOT / "examples" / "unfold" / "diagram.json").read_text())


def edges(pg):
    return pg.locator("#ss-scene .edge").count()


def box(pg, sel):
    return pg.locator(sel).bounding_box()


def centre(b):
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def overlaps(a, b):
    return not (a["x"] + a["width"] <= b["x"] or b["x"] + b["width"] <= a["x"] or a["y"] + a["height"] <= b["y"] or b["y"] + b["height"] <= a["y"])


def add_from_palette(pg, label):
    pg.click('#ss-palette [data-shape="rounded"]')
    new = pg.evaluate("document.querySelector('#ss-scene .node.sel').dataset.id")
    pg.keyboard.type(label)
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(150)
    return new


def drag_port(pg, node_id, side, to_xy):
    nb = box(pg, f'.node[data-id="{node_id}"] .body')
    pg.mouse.move(*centre(nb))
    pg.wait_for_timeout(120)
    px, py = centre(box(pg, f'.node[data-id="{node_id}"] .port[data-port="{side}"] .port-dot'))
    pg.mouse.move(px, py)
    pg.mouse.down()
    pg.mouse.move(*to_xy, steps=10)
    pg.mouse.up()
    pg.wait_for_timeout(250)


def drop_files(pg, x, y, files):
    """Dispatch a real drop event carrying files (name, mime, bytes) at screen point x, y."""
    pg.evaluate("""([x, y, files]) => {
        const dt = new DataTransfer();
        files.forEach(([name, type, b64]) => dt.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], name, {type})));
        const el = document.elementFromPoint(x, y);
        el.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt}));
        el.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt}));
    }""", [x, y, [[n, t, base64.b64encode(b).decode()] for n, t, b in files]])
    pg.wait_for_timeout(400)


# ---------- linking ----------

def test_palette_click_never_lands_on_another_node(mapped):
    new = add_from_palette(mapped, "Fresh")
    nb = box(mapped, f'.node[data-id="{new}"] .body')
    others = mapped.evaluate("id => [...document.querySelectorAll('#ss-scene .node')].filter(n => n.dataset.id !== id).map(n => n.dataset.id)", new)
    assert not [o for o in others if overlaps(nb, box(mapped, f'.node[data-id="{o}"] .body'))]


def test_new_node_links_to_an_existing_node(mapped):
    """Given a node just added from the palette, when I drag its port onto an existing node, then an edge joins them."""
    new = add_from_palette(mapped, "Fresh")
    e0 = edges(mapped)
    drag_port(mapped, new, "r", centre(box(mapped, '.node[data-id="codebase"] .body')))
    assert edges(mapped) == e0 + 1
    d = data(mapped)
    assert {"from": new, "to": "codebase"} in [{"from": e["from"], "to": e["to"]} for e in d["root"]["edges"]]


def test_release_near_a_node_links_instead_of_adding_one(mapped):
    """Given a drag from a port, when I release just outside a node, then it links to that node and adds none."""
    n0, e0 = nodes(mapped), edges(mapped)
    tb = box(mapped, '.node[data-id="page"] .body')
    drag_port(mapped, "peek", "b", (tb["x"] + tb["width"] / 2, tb["y"] + tb["height"] + 12))
    assert nodes(mapped) == n0 and edges(mapped) == e0 + 1


def test_link_button_then_click_target(mapped):
    """Given a selected node, when I press Link and click another node, then an edge connects them."""
    e0 = edges(mapped)
    mapped.click('.node[data-id="peek"]')
    mapped.click('[data-act="link"]')
    mapped.click('.node[data-id="page"] .body')
    mapped.wait_for_timeout(200)
    assert edges(mapped) == e0 + 1
    assert mapped.evaluate("document.body.classList.contains('linking')") is False


def test_esc_cancels_link_mode(mapped):
    e0 = edges(mapped)
    mapped.click('.node[data-id="peek"]')
    mapped.click('[data-act="link"]')
    mapped.keyboard.press("Escape")
    mapped.click('.node[data-id="page"] .body')
    assert edges(mapped) == e0


# ---------- bend points and path styles ----------

def select_edge(pg, i):
    pg.evaluate("i => { const p = document.querySelector('#ss-scene .edge[data-i=\"' + i + '\"] .hit'); const L = p.getTotalLength(), q = p.getPointAtLength(L / 2); const m = p.getScreenCTM(); window.__pt = [q.x * m.a + m.e, q.y * m.d + m.f]; }", i)
    x, y = pg.evaluate("window.__pt")
    pg.mouse.click(x, y)
    pg.wait_for_timeout(200)


def test_drag_midpoint_adds_a_bend_point_that_persists(mapped):
    """Given a selected edge, when I drag its middle handle, then a bend point is created and kept."""
    select_edge(mapped, 0)
    assert mapped.locator("#ss-scene .wph .wpm").count() >= 1
    x, y = centre(box(mapped, "#ss-scene .wph .wpm .wp-dot"))
    mapped.mouse.move(x, y)
    mapped.mouse.down()
    mapped.mouse.move(x + 30, y + 90, steps=8)
    mapped.mouse.up()
    mapped.wait_for_timeout(200)
    d = data(mapped)
    assert len(d["root"]["edges"][0].get("points", [])) == 1
    assert mapped.locator("#ss-scene .wph .wp").count() == 1
    # double-click the bend point to remove it
    mapped.dblclick("#ss-scene .wph .wp .wp-dot")
    mapped.wait_for_timeout(200)
    assert "points" not in saved(mapped)["root"]["edges"][0]


def test_edge_path_style_and_level_style(mapped):
    select_edge(mapped, 1)
    mapped.click('[data-act="eroute"][data-arg="orthogonal"]')
    assert data(mapped)["root"]["edges"][1]["route"] == "orthogonal"
    mapped.keyboard.press("Escape")
    mapped.click('[data-act="lroute"]')
    assert data(mapped)["root"].get("route") == "orthogonal"


def test_tidy_resets_bend_points_and_offers_undo(mapped):
    select_edge(mapped, 0)
    x, y = centre(box(mapped, "#ss-scene .wph .wpm .wp-dot"))
    mapped.mouse.move(x, y); mapped.mouse.down(); mapped.mouse.move(x, y + 80, steps=6); mapped.mouse.up()
    mapped.keyboard.press("Escape")
    mapped.click('[data-act="tidy"]')
    mapped.wait_for_timeout(300)
    assert "points" not in saved(mapped)["root"]["edges"][0]
    assert "custom path" in mapped.locator("#ss-toast").inner_text()


# ---------- layout quality ----------

EDGE_THROUGH_NODES = """() => {
  const nodes = [...document.querySelectorAll('#ss-scene .node')].map(g => {
    const b = g.querySelector('.body').getBBox(), m = g.transform.baseVal.consolidate().matrix;
    return {id: g.dataset.id, x0: b.x + m.e, y0: b.y + m.f, x1: b.x + b.width + m.e, y1: b.y + b.height + m.f};
  });
  const hits = [];
  document.querySelectorAll('#ss-scene .edge').forEach(g => {
    const p = g.querySelector('.line'), L = p.getTotalLength(), e = window.__edges[+g.dataset.i];
    for (let k = 1; k < 60; k++) {
      const q = p.getPointAtLength(L * k / 60);
      nodes.forEach(n => { if (n.id !== e.from && n.id !== e.to && q.x > n.x0 + 4 && q.x < n.x1 - 4 && q.y > n.y0 + 4 && q.y < n.y1 - 4) hits.push(e.from + '>' + e.to + ' through ' + n.id); });
    }
  });
  return [...new Set(hits)];
}"""


@pytest.mark.parametrize("fixture", ["fan-in", "pipeline", "services"])
def test_auto_layout_routes_no_edge_through_a_node(browser, tmp_path, fixture):
    """Given a gnarly graph, when it is auto-laid out, then no edge passes through a node it doesn't connect."""
    d = json.loads((FIXTURES / f"{fixture}.json").read_text())
    assert story.validate(d).ok
    page = tmp_path / "p.html"
    page.write_text(story.embed(d, TEMPLATE_TEXT), encoding="utf-8")
    c, pg = open_page(browser, page.as_uri())
    pg.evaluate("e => { window.__edges = e }", d["root"]["edges"])
    assert pg.evaluate(EDGE_THROUGH_NODES) == []
    assert not pg.errors
    c.close()


# ---------- media ----------

def test_dropping_a_file_on_a_node_attaches_it(mapped):
    """Given a component in edit mode, when I drop a PNG on it, then it gains the media and no node is added."""
    n0 = nodes(mapped)
    x, y = centre(box(mapped, '.node[data-id="peek"] .body'))
    drop_files(mapped, x, y, [("shot.png", "image/png", PNG)])
    assert nodes(mapped) == n0
    n = next(n for n in data(mapped)["root"]["nodes"] if n["id"] == "peek")
    assert n["media"]["src"].startswith("data:image/png")
    assert mapped.locator('.node[data-id="peek"] .enter.media').count() == 1


def test_dropping_on_empty_canvas_still_makes_an_image_node(mapped):
    n0 = nodes(mapped)
    drop_files(mapped, 700, 780, [("diagram.png", "image/png", PNG)])
    assert nodes(mapped) == n0 + 1


def test_media_gallery_pages_through_several_items(browser, tmp_path):
    """Given a node with two media items, when a viewer opens it, then it pages with the arrow keys."""
    d = json.loads((ROOT / "engine" / "sample.json").read_text())
    uri = "data:image/png;base64," + base64.b64encode(PNG).decode()
    leaf = d["root"]["nodes"][2]
    leaf.pop("children", None)
    leaf.pop("note", None)
    leaf.pop("source", None)
    leaf["media"] = [{"src": uri, "caption": "First"}, {"src": uri, "caption": "Second"}]
    assert story.validate(d).ok
    page = tmp_path / "g.html"
    page.write_text(story.embed(d, TEMPLATE_TEXT), encoding="utf-8")
    c, pg = open_page(browser, page.as_uri())
    pg.click(f'.node[data-id="{leaf["id"]}"] .body')
    pg.wait_for_timeout(600)
    assert "1 / 2" in pg.locator("#ss-viewer").inner_text()
    pg.keyboard.press("ArrowRight")
    assert "2 / 2" in pg.locator("#ss-viewer").inner_text() and "Second" in pg.locator("#ss-viewer").inner_text()
    pg.keyboard.press("Escape")
    assert pg.locator("#ss-viewer").is_hidden()
    c.close()


def test_media_popover_uploads_and_removes(mapped, tmp_path):
    png = tmp_path / "a.png"
    png.write_bytes(PNG)
    mapped.click('.node[data-id="peek"]')
    mapped.click('[data-act="pop"][data-arg="media"]')
    assert mapped.locator(".media-pop .m-empty").count() == 1
    with mapped.expect_file_chooser() as fc:
        mapped.click('.media-pop [data-act="upload-media"]')
    fc.value.set_files(str(png))
    mapped.wait_for_timeout(400)
    assert mapped.locator(".media-pop .m-list li").count() == 1
    mapped.click('.media-pop [data-act="media-del"]')
    assert "media" not in next(n for n in saved(mapped)["root"]["nodes"] if n["id"] == "peek")


EDGES_ON_TOP_OF_EACH_OTHER = """() => {
  const edges = [...document.querySelectorAll('#ss-scene .edge')].map(g => {
    const p = g.querySelector('.line'), L = p.getTotalLength(), pts = [];
    for (let k = 0; k <= 60; k++) { const q = p.getPointAtLength(L * k / 60); pts.push([q.x, q.y]); }
    return pts;
  });
  let pairs = 0;
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    let close = 0;
    for (let a = 4; a < 57; a++) if (edges[j].some(q => Math.hypot(q[0] - edges[i][a][0], q[1] - edges[i][a][1]) < 3)) close++;
    if (close >= 5) pairs++;
  }
  return pairs;
}"""


@pytest.mark.parametrize("fixture,most", [("pipeline", 0), ("services", 0), ("fan-in", 2)])
def test_links_do_not_run_on_top_of_each_other(browser, tmp_path, fixture, most):
    """Given links that share a node side, when routed, then they fan out instead of overlapping."""
    d = json.loads((FIXTURES / f"{fixture}.json").read_text())
    page = tmp_path / "p.html"
    page.write_text(story.embed(d, TEMPLATE_TEXT), encoding="utf-8")
    c, pg = open_page(browser, page.as_uri())
    assert pg.evaluate(EDGES_ON_TOP_OF_EACH_OTHER) <= most
    c.close()


def test_a_decision_fanning_out_to_five_branches_stays_apart(browser):
    c, pg = open_page(browser)
    pg.click('.node[data-id="claude"] .body')
    pg.wait_for_timeout(1700)
    assert pg.evaluate(EDGES_ON_TOP_OF_EACH_OTHER) == 0
    c.close()
