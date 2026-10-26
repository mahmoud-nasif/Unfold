"""End-to-end tests for exports (PNG, SVG, Mermaid, draw.io, Excalidraw, print) and Mermaid import (0.4.0).

Run with:  pytest -m e2e
"""
import json
import xml.etree.ElementTree as ET

import pytest

pw = pytest.importorskip("playwright.sync_api")
pytestmark = pytest.mark.e2e

from test_e2e_page import ROOT, TEMPLATE, browser, open_page, data  # noqa: E402,F401

TYPES = (ROOT / "examples" / "types" / "index.html").as_uri()


def grab(pg, act):
    pg.click('[data-act="export"]')
    with pg.expect_download() as dl:
        pg.click(f'[data-act="{act}"]')
    d = dl.value
    return d.suggested_filename, open(d.path(), "rb").read()


@pytest.fixture
def types(browser):
    c, pg = open_page(browser, TYPES)
    yield pg
    c.close()


def test_png_and_svg_of_the_current_level(types):
    name, png = grab(types, "ex-png")
    assert name.endswith(".png") and png[:8] == b"\x89PNG\r\n\x1a\n" and len(png) > 5000
    types.keyboard.press("Escape")
    name, svg = grab(types, "ex-svg")
    root = ET.fromstring(svg)
    assert name.endswith(".svg") and root.tag.endswith("svg")
    assert svg.count(b'class="node ') == 7


def test_mermaid_markdown_has_a_block_per_level(types):
    name, md = grab(types, "ex-mermaid")
    md = md.decode()
    assert name.endswith(".md")
    assert md.count("```mermaid") == 8
    for head in ("flowchart", "classDiagram", "timeline"):
        assert head in md
    assert "Order <|-- " not in md and "Entity <|-- Order" in md


def test_drawio_has_a_linked_page_per_level(types):
    name, x = grab(types, "ex-drawio")
    root = ET.fromstring(x)
    pages = root.findall("diagram")
    assert name.endswith(".drawio") and len(pages) == 8
    links = [o.get("link") for o in pages[0].iter("UserObject")]
    assert all(l and l.startswith("data:page/id,page") for l in links)


def test_excalidraw_binds_arrows_to_shapes(browser):
    c, pg = open_page(browser)
    name, raw = grab(pg, "ex-excalidraw")
    doc = json.loads(raw)
    assert doc["type"] == "excalidraw"
    arrows = [e for e in doc["elements"] if e["type"] == "arrow"]
    shapes = {e["id"] for e in doc["elements"] if e["type"] in ("rectangle", "ellipse", "diamond")}
    assert arrows and all(a["startBinding"]["elementId"] in shapes and a["endBinding"]["elementId"] in shapes for a in arrows)
    c.close()


def test_print_builds_one_section_per_level(types):
    types.evaluate("window.print = () => { window.__printed = document.querySelectorAll('#ss-print section').length }")
    types.click('[data-act="export"]')
    types.click('[data-act="ex-pdf"]')
    types.wait_for_timeout(300)
    assert types.evaluate("window.__printed") == 8


MERMAID = {
    "flowchart LR\n  subgraph edge [Edge]\n    web([Web app]) -- HTTPS --> gw[Gateway]\n  end\n  gw --> api(API) & auth{Auth?}\n  api -.->|writes| db[(Orders)]": ("architecture", 5, 4),
    "sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: POST /orders\n  S-->>C: 201 Created": ("sequence", 2, 2),
    "classDiagram\n  Animal <|-- Dog\n  class Dog {\n    +bark() void\n    -name: str\n  }\n  Dog *-- Tail : has": ("class", 3, 2),
    "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy : goal\n  Busy --> [*]": ("state", 4, 3),
}


@pytest.mark.parametrize("src", list(MERMAID))
def test_mermaid_import_replaces_the_level(browser, src):
    c, pg = open_page(browser, TEMPLATE)
    pg.click('[data-act="mode-edit"]')
    pg.on("dialog", lambda d: d.accept())
    pg.click('[data-act="export"]')
    pg.click("text=Import a Mermaid diagram into this level")
    pg.fill("#ss-mm", src)
    pg.click('[data-act="ex-import"]')
    pg.wait_for_timeout(400)
    t, n, e = MERMAID[src]
    d = data(pg)
    assert d["root"]["type"] == t
    assert len(d["root"]["nodes"]) == n and len(d["root"]["edges"]) == e
    if t == "class":
        dog = next(x for x in d["root"]["nodes"] if x["id"] == "Dog")
        assert dog["methods"] == ["+bark() void"] and dog["fields"] == ["-name: str"]
        assert {"from": "Dog", "to": "Animal", "rel": "inherits"} in d["root"]["edges"]
    if t == "architecture":
        assert d["root"]["groups"][0]["label"] == "Edge"
        assert any(x.get("label") == "writes" and x.get("style") == "dashed" for x in d["root"]["edges"])
    assert not pg.errors
    c.close()


def test_mermaid_import_reports_unsupported_text(browser):
    c, pg = open_page(browser, TEMPLATE)
    pg.click('[data-act="mode-edit"]')
    pg.click('[data-act="export"]')
    pg.click("text=Import a Mermaid diagram into this level")
    pg.fill("#ss-mm", "pie title Pets\n  \"Dogs\" : 386")
    pg.click('[data-act="ex-import"]')
    assert "reads flowchart" in pg.locator("#ss-mm-err").inner_text()
    c.close()
