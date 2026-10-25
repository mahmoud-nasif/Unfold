#!/usr/bin/env python3
"""unfold CLI: validate diagram data, build pages, and read them back.

    python unfold.py check   diagram.json
    python unfold.py build   diagram.json page.html [--template PATH]
    python unfold.py extract page.html [diagram.json]
    python unfold.py outline diagram.json|page.html

`check` and `build` exit 1 and list every error when the data is invalid.
Warnings never fail; they point at things a reader would trip over.
`extract` pulls the data out of a page someone edited in the browser.
`outline` prints the nesting as an indented tree, for a quick structural review.

Standard library only, Python 3.8+.
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_TEMPLATE = HERE.parent / "assets" / "template.html"

ICONS = frozenset("""
chip server storage database cloud network wifi usb monitor terminal code box layers
gear wrench sync bolt rocket flag list file folder chart pulse gauge clock bell alert
check shield lock key user message link branch upload download power search eye camera
spark target robot arm flask
""".split())
SHAPES = frozenset({
    "rounded", "rect", "pill", "diamond", "parallelogram", "cylinder", "document",
    "hexagon", "cloud", "circle", "triangle", "text", "table", "image", "initial", "final",
})
COLORS = frozenset({"blue", "teal", "amber", "rose", "violet", "slate", "neutral"})
LEVEL_TYPES = frozenset({"architecture", "process", "sequence", "state", "data"})
FLOW_TYPES = frozenset({"architecture", "process"})
MEDIA_TYPES = frozenset({"image", "video", "embed"})
DIRECTIONS = frozenset({"LR", "TB"})
ROLES = frozenset({"input", "output"})
EDGE_STYLES = frozenset({"flow", "solid", "dashed"})
ARROWS = frozenset({"end", "both", "none"})
TEXT_SIZES = frozenset({"s", "m", "l"})
HEX_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")
LEGACY_NODE_FIELDS = ("kind", "stats")
MAX_LABEL = 60
MAX_EDGE_LABEL = 28

DATA_RE = re.compile(r'(<script type="application/json" id="story-data">)(.*?)(</script>)', re.S)
TITLE_RE = re.compile(r"<title>.*?</title>", re.S)


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    @property
    def ok(self):
        return not self.errors


def _num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _str_list(v):
    return isinstance(v, list) and all(isinstance(s, str) for s in v)


def _valid_color(c):
    return c in COLORS or (isinstance(c, str) and bool(HEX_RE.match(c)))


def _check_node(n, loc, rep, group_ids):
    label = n.get("label")
    marker = n.get("shape") in ("initial", "final")
    if not isinstance(label, str) or (not label.strip() and not marker):
        rep.error(f"{loc}: missing 'label'")
    elif len(label) > MAX_LABEL:
        rep.warn(f"{loc}: label is {len(label)} chars; keep labels short and move detail into 'note'")
    shape = n.get("shape")
    if shape is not None and shape not in SHAPES:
        rep.error(f"{loc}: unknown shape '{shape}' (use one of {', '.join(sorted(SHAPES))})")
    if n.get("color") is not None and not _valid_color(n["color"]):
        rep.error(f"{loc}: colour must be one of {', '.join(sorted(COLORS))} or a hex value")
    if n.get("role") is not None and n["role"] not in ROLES:
        rep.error(f"{loc}: role must be 'input' or 'output'")
    icon = n.get("icon")
    if icon is not None and not isinstance(icon, str):
        rep.error(f"{loc}: 'icon' must be a string")
    elif icon and icon not in ICONS and len(icon) > 3:
        rep.warn(f"{loc}: icon '{icon}' is not in the library and will render as text")
    for c in ("x", "y", "w", "h"):
        if c in n and not _num(n[c]):
            rep.error(f"{loc}: '{c}' must be a number")
    for c in ("w", "h"):
        if _num(n.get(c)) and n[c] < 20:
            rep.error(f"{loc}: '{c}' must be at least 20")
    if ("x" in n) != ("y" in n):
        rep.error(f"{loc}: give both 'x' and 'y', or neither")
    text = n.get("text")
    if text is not None:
        if not isinstance(text, dict):
            rep.error(f"{loc}: 'text' must be an object")
        else:
            if "size" in text and text["size"] not in TEXT_SIZES:
                rep.error(f"{loc}: text.size must be s, m or l")
            for b in ("bold", "italic"):
                if b in text and not isinstance(text[b], bool):
                    rep.error(f"{loc}: text.{b} must be true or false")
    if "source" in n and not _str_list(n["source"]):
        rep.error(f"{loc}: 'source' must be a list of file paths or symbols")
    for f in ("note", "tag"):
        if f in n and not isinstance(n[f], str):
            rep.error(f"{loc}: '{f}' must be a string")
    if "fields" in n and not _str_list(n["fields"]):
        rep.error(f"{loc}: 'fields' must be a list of strings like 'id: int PK'")
    media = n.get("media")
    if media is not None:
        if not isinstance(media, dict) or not isinstance(media.get("src"), str) or not media["src"]:
            rep.error(f"{loc}: 'media' needs a string 'src'")
        elif media.get("type") is not None and media["type"] not in MEDIA_TYPES:
            rep.error(f"{loc}: media.type must be image, video or embed")
    if n.get("shape") == "image" and not (isinstance(media, dict) and media.get("src")):
        rep.warn(f"{loc}: image node without media.src shows an empty placeholder")
    if n.get("group") is not None and n["group"] not in group_ids:
        rep.error(f"{loc}: group '{n['group']}' is not defined in this level's 'groups'")
    for f in LEGACY_NODE_FIELDS:
        if f in n:
            rep.warn(f"{loc}: '{f}' is a v1 field and is ignored")


def _check_groups(level, where, rep):
    groups = level.get("groups", []) or []
    ids = set()
    if not isinstance(groups, list):
        rep.error(f"{where}: 'groups' must be a list")
        return ids
    for k, g in enumerate(groups):
        loc = f"{where} > groups[{k}]"
        if not isinstance(g, dict) or not isinstance(g.get("id"), str) or not g.get("id"):
            rep.error(f"{loc}: needs a string 'id'")
            continue
        if any(c in g for c in ("x", "y", "w", "h")):
            rep.warn(f"{loc}: group rectangles are a v1 feature; groups are drawn around their member nodes")
        if g["id"] in ids:
            rep.error(f"{loc}: duplicate group id '{g['id']}'")
        ids.add(g["id"])
        if g.get("color") is not None and not _valid_color(g["color"]):
            rep.error(f"{loc}: colour must be one of {', '.join(sorted(COLORS))} or a hex value")
    return ids


def _check_level(level, where, rep):
    if not isinstance(level, dict):
        rep.error(f"{where}: a level must be an object")
        return
    ltype = level.get("type", "architecture")
    if ltype not in LEVEL_TYPES:
        rep.error(f"{where}: 'type' must be 'architecture' or 'process'")
    if "direction" in level and level["direction"] not in DIRECTIONS:
        rep.error(f"{where}: 'direction' must be 'LR' or 'TB'")
    group_ids = _check_groups(level, where, rep)
    nodes = level.get("nodes", [])
    if not isinstance(nodes, list):
        rep.error(f"{where}: 'nodes' must be a list")
        return
    ids, positioned = set(), 0
    for i, n in enumerate(nodes):
        loc = f"{where} > nodes[{i}]"
        if not isinstance(n, dict):
            rep.error(f"{loc}: must be an object")
            continue
        nid = n.get("id")
        if not isinstance(nid, str) or not nid:
            rep.error(f"{loc}: missing string 'id'")
            continue
        if nid in ids:
            rep.error(f"{loc}: duplicate id '{nid}' in the same level")
        ids.add(nid)
        if "x" in n and "y" in n:
            positioned += 1
        _check_node(n, f"{where} > {nid}", rep, group_ids)
        if "children" in n:
            _check_level(n["children"], f"{where} > {nid}", rep)
    if 0 < positioned < len(ids):
        rep.warn(f"{where}: only some nodes have x/y; the whole level will be auto-laid out")
    members = {n.get("group") for n in nodes if isinstance(n, dict)}
    for gid in sorted(group_ids - members):
        rep.warn(f"{where}: group '{gid}' has no member nodes and will not be drawn")
    edges = level.get("edges", []) or []
    if not isinstance(edges, list):
        rep.error(f"{where}: 'edges' must be a list")
        edges = []
    for j, e in enumerate(edges):
        loc = f"{where} > edges[{j}]"
        if not isinstance(e, dict):
            rep.error(f"{loc}: must be an object")
            continue
        for end in ("from", "to"):
            if e.get(end) not in ids:
                rep.error(f"{loc}: '{end}' = {e.get(end)!r} is not a node id in this level")
        if e.get("from") is not None and e.get("from") == e.get("to") and ltype != "sequence":
            rep.error(f"{loc}: an edge cannot connect a node to itself")
        if e.get("style") is not None and e["style"] not in EDGE_STYLES:
            rep.error(f"{loc}: 'style' must be one of {', '.join(sorted(EDGE_STYLES))}")
        if e.get("arrow") is not None and e["arrow"] not in ARROWS:
            rep.error(f"{loc}: 'arrow' must be one of {', '.join(sorted(ARROWS))}")
        if isinstance(e.get("label"), str) and len(e["label"]) > MAX_EDGE_LABEL:
            rep.warn(f"{loc}: edge label is long; name what flows in two or three words")
    roles = {n.get("role") for n in nodes if isinstance(n, dict)}
    if ltype == "sequence" and nodes and not edges:
        rep.warn(f"{where}: a sequence level with no messages")
    if ltype == "data":
        loose = [n.get("id") for n in nodes if isinstance(n, dict) and n.get("shape", "table") == "table" and not n.get("fields")]
        if loose:
            rep.warn(f"{where}: tables without fields: {', '.join(map(str, loose))}")
    if ltype not in FLOW_TYPES:
        return
    if nodes and edges and "input" not in roles:
        rep.warn(f"{where}: no node is marked as an input; readers won't see where data enters")
    if nodes and edges and "output" not in roles:
        rep.warn(f"{where}: no node is marked as an output; readers won't see what comes out")
    if ltype == "process":
        shapes = [n.get("shape") for n in nodes if isinstance(n, dict)]
        if shapes.count("rounded") > len(shapes) / 2:
            rep.warn(f"{where}: a process level drawn mostly with component boxes; use rect, pill and diamond steps")


def validate(data):
    rep = Report()
    if not isinstance(data, dict):
        rep.error("the top level must be an object")
        return rep
    meta = data.get("meta")
    if not isinstance(meta, dict) or not meta.get("title"):
        rep.error("'meta.title' is required")
    if isinstance(meta, dict):
        if "summary" in meta and not isinstance(meta["summary"], str):
            rep.error("'meta.summary' must be a string")
        elif isinstance(meta.get("summary"), str) and len(meta["summary"]) > 240:
            rep.warn("'meta.summary' is long; one or two sentences reads best")
        gl = meta.get("glossary")
        if gl is not None and not (isinstance(gl, list) and all(isinstance(x, dict) and isinstance(x.get("term"), str) and isinstance(x.get("def"), str) for x in gl)):
            rep.error("'meta.glossary' must be a list of {term, def}")
        elif isinstance(gl, list) and len(gl) > 8:
            rep.warn("'meta.glossary' shows at most 8 terms")
    if "story" in data:
        rep.warn("'story' is a v1 field; story mode was removed and it is ignored")
    if "kinds" in data:
        rep.warn("'kinds' is a v1 field; use 'color' on nodes instead")
    if not isinstance(data.get("root"), dict):
        rep.error("a 'root' level is required")
        return rep
    _check_level(data["root"], "root", rep)
    return rep


def inline_media(data, base_dir, max_mb=12):
    """Replace local media paths with data URIs, resolved against base_dir. Returns list of warnings."""
    import base64
    import mimetypes
    notes = []

    def conv(src):
        if not isinstance(src, str) or re.match(r"^(data:|https?:|//)", src):
            return src
        f = (Path(base_dir) / src).resolve()
        if not f.is_file():
            raise FileNotFoundError(f"media file not found: {src}")
        size = f.stat().st_size
        if size > max_mb * 1024 * 1024:
            raise ValueError(f"media file over {max_mb} MB: {src}")
        if size > 3 * 1024 * 1024:
            notes.append(f"embedded {src} ({size // 1048576} MB) makes the page heavy")
        mime = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        return f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode("ascii")

    def walk(level):
        for n in level.get("nodes", []):
            m = n.get("media")
            if isinstance(m, dict):
                for k in ("src", "poster"):
                    if k in m:
                        m[k] = conv(m[k])
            if isinstance(n.get("children"), dict):
                walk(n["children"])

    walk(data.get("root", {}))
    return notes


def embed(data, template_text):
    """Return template_text with data injected and the <title> set."""
    if not DATA_RE.search(template_text):
        raise ValueError("the template has no story-data script block")
    payload = json.dumps(data, ensure_ascii=False, indent=1).replace("<", "\\u003c")
    out = DATA_RE.sub(lambda m: m.group(1) + payload + m.group(3), template_text, count=1)
    title = html.escape(str(data["meta"]["title"]))
    return TITLE_RE.sub(lambda m: f"<title>{title}</title>", out, count=1)


def extract(page_text):
    """Return the diagram data embedded in a built page."""
    m = DATA_RE.search(page_text)
    if not m:
        raise ValueError("no story-data block found; is this a unfold page?")
    return json.loads(m.group(2))


def outline(data):
    """Return an indented text tree: levels, nodes, roles, shapes and edge counts."""
    lines = [str(data.get("meta", {}).get("title", "Untitled"))]

    def walk(level, depth):
        pad = "  " * depth
        lines.append(f"{pad}[{level.get('type', 'architecture')}] {level.get('caption', '')}".rstrip())
        for n in level.get("nodes", []):
            tags = []
            if n.get("role"):
                tags.append(n["role"].upper())
            if n.get("media"):
                tags.append("media")
            if n.get("shape") and n["shape"] not in ("rounded", "rect"):
                tags.append(n["shape"])
            if n.get("source"):
                tags.append(f"{len(n['source'])} src")
            mark = "+" if n.get("children") else "-"
            lines.append(f"{pad}  {mark} {n.get('label', n.get('id'))}" + (f"  ({', '.join(tags)})" if tags else ""))
            if n.get("children"):
                walk(n["children"], depth + 2)
        if level.get("edges"):
            lines.append(f"{pad}  ({len(level['edges'])} edges)")

    walk(data.get("root", {}), 1)
    return "\n".join(lines)


def _load(path):
    text = Path(path).read_text(encoding="utf-8")
    if str(path).endswith((".html", ".htm")):
        return extract(text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        sys.exit(f"error: {path} is not valid JSON: {e}")


def _print_report(rep):
    for w in rep.warnings:
        print(f"warning: {w}")
    for e in rep.errors:
        print(f"error: {e}", file=sys.stderr)


def cmd_check(a):
    rep = validate(_load(a.diagram))
    _print_report(rep)
    if not rep.ok:
        return 1
    print(f"ok: {a.diagram}")
    return 0


def cmd_build(a):
    data = _load(a.diagram)
    rep = validate(data)
    _print_report(rep)
    if not rep.ok:
        return 1
    try:
        for note in inline_media(data, Path(a.diagram).resolve().parent):
            print(f"warning: {note}")
    except (FileNotFoundError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    out = embed(data, Path(a.template).read_text(encoding="utf-8"))
    Path(a.output).write_text(out, encoding="utf-8")
    print(f"built {a.output} ({len(out.encode('utf-8')) // 1024} KB)")
    return 0


def cmd_extract(a):
    data = extract(Path(a.page).read_text(encoding="utf-8"))
    text = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if a.output:
        Path(a.output).write_text(text, encoding="utf-8")
        print(f"extracted {a.output}")
    else:
        sys.stdout.write(text)
    return 0


def cmd_outline(a):
    print(outline(_load(a.source)))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="unfold.py", description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check", help="validate a diagram JSON file (or a built page)")
    c.add_argument("diagram")
    c.set_defaults(fn=cmd_check)
    b = sub.add_parser("build", help="validate and build a page")
    b.add_argument("diagram")
    b.add_argument("output")
    b.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    b.set_defaults(fn=cmd_build)
    x = sub.add_parser("extract", help="pull diagram data out of a built page")
    x.add_argument("page")
    x.add_argument("output", nargs="?")
    x.set_defaults(fn=cmd_extract)
    o = sub.add_parser("outline", help="print the nesting as a text tree")
    o.add_argument("source")
    o.set_defaults(fn=cmd_outline)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
