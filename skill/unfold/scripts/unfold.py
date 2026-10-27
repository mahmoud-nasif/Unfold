#!/usr/bin/env python3
"""unfold CLI: validate diagram data, build pages, and read them back.

    python unfold.py check   diagram.json
    python unfold.py build   diagram.json page.html [--template PATH] [--repo PATH]
    python unfold.py extract page.html [diagram.json]
    python unfold.py upgrade PAGE_OR_DIR... [--check] [--backup] [-o OUT] [--template PATH]
    python unfold.py usage   diagram.json|page.html (--latest | --transcript FILE) [--since TS] [--rates IN,OUT,CW,CR | --cost USD]
    python unfold.py status  diagram.json|page.html [--json]
    python unfold.py outline diagram.json|page.html
    python unfold.py drift   diagram.json|page.html --repo PATH [--json]
    python unfold.py diff    old.json new.json [--json] [--page OUT.html]
    python unfold.py merge   --base generated-old.json --ours edited.json --theirs generated-new.json -o OUT

`check` and `build` exit 1 and list every error when the data is invalid.
Warnings never fail; they point at things a reader would trip over.
`build --repo` pins `meta.repo` (url, commit, root) from git so source links open
the exact lines that were mapped.
`extract` pulls the data out of a page someone edited in the browser.
`status` counts the parts still tagged `planned` against those built, per level (plan mode).
`upgrade` rebuilds existing pages with the current engine from the data inside them, so
no agent has to read the code again; `--check` only reports which pages are out of date.
`usage` stamps `meta.generation` (tokens and cost of the agent session) from a Claude Code
transcript or from numbers you give it; the page shows it in its info panel.
`outline` prints the nesting as an indented tree, for a quick structural review.
`drift` checks every node `source` against the code and exits 1 if any file,
symbol or line no longer matches (a symbol that moved is named with its new file).
`diff` lists added, removed and changed nodes and edges; `--page` builds NEW with
removed elements put back and every difference marked with a `diff` field.
`merge` re-maps without losing hand edits: a field changed by a person is kept,
everything else follows the new scan, and conflicts are listed.

Standard library only, Python 3.8+.
"""
import argparse
import ast
import copy
import html
import json
import re
import subprocess
import sys
from collections import Counter
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
    "class", "person", "node3d",
})
COLORS = frozenset({"blue", "teal", "amber", "rose", "violet", "slate", "neutral"})
LEVEL_TYPES = frozenset({"architecture", "process", "sequence", "state", "data",
                         "class", "c4", "deployment", "dependency", "tree", "behaviour", "timeline"})
FLOW_TYPES = frozenset({"architecture", "process", "c4"})
BT_KINDS = frozenset({"sequence", "selector", "parallel", "decorator", "action", "condition"})
RELATIONS = frozenset({"inherits", "implements", "composition", "aggregation", "association", "dependency"})
MEDIA_TYPES = frozenset({"image", "video", "embed"})
DIRECTIONS = frozenset({"LR", "TB"})
ROLES = frozenset({"input", "output"})
EDGE_STYLES = frozenset({"flow", "solid", "dashed"})
ARROWS = frozenset({"end", "both", "none"})
ROUTES = frozenset({"curved", "orthogonal", "straight"})
SIDES = frozenset({"t", "r", "b", "l"})
GEN_NUMBERS = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens", "cost", "duration_s")
GEN_STRINGS = ("agent", "model", "currency", "generated_at", "note")
TEXT_SIZES = frozenset({"s", "m", "l"})
INTENTS = frozenset({"learn", "demonstrate", "explain", "review", "document", "debug", "refactor", "audit", "plan", "other"})
HEX_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")
CONFIDENCE = frozenset({"read", "peeked", "inferred"})
DIFF_MARKS = frozenset({"added", "removed", "changed"})
REPO_KEYS = frozenset({"url", "commit", "root"})
SHA_RE = re.compile(r"^[0-9a-f]{7,64}$")
SOURCE_RE = re.compile(r"^(?P<path>.+?)(?::(?:(?P<a>\d+)(?:-(?P<b>\d+))?|(?P<sym>[A-Za-z_$~][\w$.:~]*)))?$")
UNMARKED_SHAPES = ("initial", "final", "text")
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
    if "methods" in n and not _str_list(n["methods"]):
        rep.error(f"{loc}: 'methods' must be a list of strings like '+ total(): Money'")
    for f in ("tech", "date", "stereotype"):
        if f in n and not isinstance(n[f], str):
            rep.error(f"{loc}: '{f}' must be a string")
    if n.get("bt") is not None and n["bt"] not in BT_KINDS:
        rep.error(f"{loc}: 'bt' must be one of {', '.join(sorted(BT_KINDS))}")
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
    if "tags" in n and not _str_list(n["tags"]):
        rep.error(f"{loc}: 'tags' must be a list of short strings")
    if "fields" in n and not _str_list(n["fields"]):
        rep.error(f"{loc}: 'fields' must be a list of strings like 'id: int PK'")
    media = n.get("media")
    items = media if isinstance(media, list) else [media] if media is not None else []
    if isinstance(media, list) and not media:
        rep.error(f"{loc}: 'media' is an empty list; leave it out instead")
    for m in items:
        if not isinstance(m, dict) or not isinstance(m.get("src"), str) or not m["src"]:
            rep.error(f"{loc}: each 'media' item needs a string 'src'")
        elif m.get("type") is not None and m["type"] not in MEDIA_TYPES:
            rep.error(f"{loc}: media.type must be image, video or embed")
    if n.get("shape") == "image" and not any(isinstance(m, dict) and m.get("src") for m in items):
        rep.warn(f"{loc}: image node without media.src shows an empty placeholder")
    if n.get("confidence") is not None and n["confidence"] not in CONFIDENCE:
        rep.error(f"{loc}: confidence must be read, peeked or inferred")
    if n.get("diff") is not None and n["diff"] not in DIFF_MARKS:
        rep.error(f"{loc}: diff must be added, removed or changed")
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
        rep.error(f"{where}: 'type' must be one of {', '.join(sorted(LEVEL_TYPES))}")
    if "direction" in level and level["direction"] not in DIRECTIONS:
        rep.error(f"{where}: 'direction' must be 'LR' or 'TB'")
    if "route" in level and level["route"] not in ROUTES:
        rep.error(f"{where}: 'route' must be one of {', '.join(sorted(ROUTES))}")
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
        if e.get("rel") is not None and e["rel"] not in RELATIONS:
            rep.error(f"{loc}: 'rel' must be one of {', '.join(sorted(RELATIONS))}")
        if e.get("route") is not None and e["route"] not in ROUTES:
            rep.error(f"{loc}: 'route' must be one of {', '.join(sorted(ROUTES))}")
        for side in ("fromSide", "toSide"):
            if e.get(side) is not None and e[side] not in SIDES:
                rep.error(f"{loc}: '{side}' must be one of t, r, b, l")
        lt = e.get("labelT")
        if lt is not None and not (_num(lt) and 0 <= lt <= 1):
            rep.error(f"{loc}: 'labelT' must be a number from 0 to 1 (where the label sits along the link)")
        pts = e.get("points")
        if pts is not None and not (isinstance(pts, list) and all(isinstance(p, list) and len(p) == 2 and all(_num(v) for v in p) for p in pts)):
            rep.error(f"{loc}: 'points' must be a list of [x, y] bend points")
        if e.get("diff") is not None and e["diff"] not in DIFF_MARKS:
            rep.error(f"{loc}: diff must be added, removed or changed")
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


def _check_generation(g, rep):
    if g is None:
        return
    if not isinstance(g, dict):
        rep.error("'meta.generation' must be an object")
        return
    for k in GEN_NUMBERS:
        if k in g and not (_num(g[k]) and g[k] >= 0):
            rep.error(f"meta.generation.{k} must be a number, zero or more")
    for k in GEN_STRINGS:
        if k in g and not isinstance(g[k], str):
            rep.error(f"meta.generation.{k} must be a string")


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
        if "intent" in meta and meta["intent"] not in INTENTS:
            rep.error(f"'meta.intent' must be one of {', '.join(sorted(INTENTS))}")
        if "audience" in meta and not isinstance(meta["audience"], str):
            rep.error("'meta.audience' must be a string")
        _check_repo(meta.get("repo"), rep)
        _check_generation(meta.get("generation"), rep)
        if "tours" in meta and isinstance(data.get("root"), dict):
            _check_tours(meta["tours"], data["root"], rep)
    if "story" in data:
        rep.warn("'story' is a v1 field; story mode was removed and it is ignored")
    if "kinds" in data:
        rep.warn("'kinds' is a v1 field; use 'color' on nodes instead")
    if not isinstance(data.get("root"), dict):
        rep.error("a 'root' level is required")
        return rep
    _check_level(data["root"], "root", rep)
    marked = [n.get("confidence") is not None for _, n in iter_nodes(data["root"]) if n.get("shape") not in UNMARKED_SHAPES]
    if any(marked) and not all(marked):
        rep.warn(f"{marked.count(False)} node(s) have no 'confidence'; mark every node read, peeked or inferred")
    return rep


def _level_at(root, path):
    level = root
    for nid in path:
        n = next((x for x in level.get("nodes", []) if isinstance(x, dict) and x.get("id") == nid), None)
        if not n or not isinstance(n.get("children"), dict):
            return None
        level = n["children"]
    return level


def _check_tours(tours, root, rep):
    """meta.tours: [{title, steps: [{path, node, title, text, notes, quiz: {q, answer, explain}}]}]; every id must resolve."""
    if not isinstance(tours, list):
        rep.error("'meta.tours' must be a list")
        return
    for t, tour in enumerate(tours):
        loc = f"meta.tours[{t}]"
        if not isinstance(tour, dict) or not isinstance(tour.get("steps"), list) or not tour["steps"]:
            rep.error(f"{loc}: needs a 'title' and a non-empty 'steps' list")
            continue
        for k, st in enumerate(tour["steps"]):
            sl = f"{loc}.steps[{k}]"
            if not isinstance(st, dict):
                rep.error(f"{sl}: must be an object")
                continue
            path = st.get("path", [])
            if not (isinstance(path, list) and all(isinstance(p, str) for p in path)):
                rep.error(f"{sl}: 'path' must be a list of node ids, from the overview down")
                continue
            level = _level_at(root, path)
            if level is None:
                rep.error(f"{sl}: path {path} does not lead to a level with an inner diagram")
                continue
            ids = {n.get("id") for n in level.get("nodes", []) if isinstance(n, dict)}
            if st.get("node") is not None and st["node"] not in ids:
                rep.error(f"{sl}: node '{st['node']}' is not in that level")
            q = st.get("quiz")
            if q is not None and not (isinstance(q, dict) and isinstance(q.get("q"), str) and q.get("answer") in ids):
                rep.error(f"{sl}: 'quiz' needs a question 'q' and an 'answer' that is a node id in that level")
            if not (st.get("text") or st.get("title") or q):
                rep.warn(f"{sl}: a step with no title, text or quiz says nothing")


def _check_repo(repo, rep):
    """meta.repo: {url, commit, root}, used to build commit-pinned source links."""
    if repo is None:
        return
    if not isinstance(repo, dict):
        rep.error("'meta.repo' must be an object {url, commit, root}")
        return
    for k in sorted(set(repo) - REPO_KEYS):
        rep.warn(f"'meta.repo.{k}' is not a known field and is ignored")
    url = repo.get("url")
    if url is not None:
        if not isinstance(url, str) or not re.match(r"^https?://[^/\s]+/\S+$", url):
            rep.error("'meta.repo.url' must be an http(s) URL such as https://github.com/owner/repo")
        elif re.match(r"^https?://[^/]*@", url):
            rep.error("'meta.repo.url' must not contain credentials")
    if repo.get("commit") is not None and not (isinstance(repo["commit"], str) and SHA_RE.match(repo["commit"])):
        rep.error("'meta.repo.commit' must be a commit hash (7 to 64 lowercase hex characters)")
    root = repo.get("root")
    if root is not None and (not isinstance(root, str) or root.startswith("/") or ".." in root.split("/")):
        rep.error("'meta.repo.root' must be a relative folder inside the repository")
    if url and not repo.get("commit"):
        rep.warn("'meta.repo' has a url but no commit; links will not be pinned (build with --repo PATH)")


# ---------- repository metadata and permalinks ----------

def git(path, *args):
    """Run git in path; stdout stripped, or None when git is missing or fails."""
    try:
        r = subprocess.run(["git", "-C", str(path)] + list(args), capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def https_url(remote):
    """Browsable https URL for a git remote (ssh, scp-like or https), without credentials or `.git`."""
    remote = (remote or "").strip()
    for rx, host, repo in ((r"^ssh://(?:[^@/]+@)?([^/:]+)(?::\d+)?/(.+?)(?:\.git)?/?$", 1, 2),
                           (r"^https?://(?:[^@/]+@)?([^/]+)/(.+?)(?:\.git)?/?$", 1, 2),
                           (r"^(?:[^@/:]+@)?([^:/]+):(?!//)(.+?)(?:\.git)?/?$", 1, 2)):
        m = re.match(rx, remote)
        if m:
            return f"https://{m.group(host)}/{m.group(repo)}"
    return None


def repo_meta(path):
    """{url, commit, root} for the git work tree holding `path` ({} if it is not one)."""
    commit = git(path, "rev-parse", "HEAD")
    if not commit:
        return {}
    out = {"commit": commit}
    url = https_url(git(path, "remote", "get-url", "origin"))
    if url:
        out["url"] = url
    prefix = (git(path, "rev-parse", "--show-prefix") or "").strip("/")
    if prefix:
        out["root"] = prefix
    return out


def parse_source(src):
    """(path, first line, last line, symbol) for `path`, `path:symbol`, `path:line` or `path:start-end`."""
    m = SOURCE_RE.match(src.strip())
    a, b = m.group("a"), m.group("b")
    return m.group("path"), int(a) if a else None, int(b) if b else (int(a) if a else None), m.group("sym")


def permalink(repo, src):
    """Link to a source reference at the pinned commit: GitHub style `/blob/`, or GitLab's `/-/blob/`.
    Symbols get no line anchor; a viewer may resolve them."""
    if not isinstance(repo, dict) or not repo.get("url") or not repo.get("commit"):
        return None
    path, a, b, _ = parse_source(src)
    path = path[2:] if path.startswith("./") else path
    full = "/".join(x for x in (str(repo.get("root") or "").strip("/"), path) if x)
    url = repo["url"].rstrip("/")
    gitlab = "gitlab" in url.split("/")[2] if url.count("/") >= 2 else False
    link = f"{url}/{'-/' if gitlab else ''}blob/{repo['commit']}/{full}"
    if a:
        link += f"#L{a}" + ((f"-{b}" if gitlab else f"-L{b}") if b and b != a else "")
    return link


# ---------- walking diagrams ----------

def iter_nodes(level, path=()):
    """Yield (id path, node) for every node, depth first."""
    for n in (level or {}).get("nodes", []) or []:
        if isinstance(n, dict):
            p = path + (str(n.get("id")),)
            yield p, n
            if isinstance(n.get("children"), dict):
                yield from iter_nodes(n["children"], p)


def levels(data):
    """{level path: level}; the root is '' and a child level is 'parent/child'."""
    out = {"": data.get("root") or {}}
    for p, n in iter_nodes(data.get("root")):
        if isinstance(n.get("children"), dict):
            out["/".join(p)] = n["children"]
    return out


# ---------- drift ----------

def _py_names(text):
    """Qualified names (Class.method, function, CONSTANT) defined in a Python file."""
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError):
        return set()
    names = set()

    def visit(body, prefix):
        for node in body:
            if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                names.add(prefix + node.name)
                visit(node.body, prefix + node.name + ".")
            elif isinstance(node, (ast.Assign, ast.AnnAssign)):
                for t in (node.targets if isinstance(node, ast.Assign) else [node.target]):
                    if isinstance(t, ast.Name):
                        names.add(prefix + t.id)
    visit(tree.body, "")
    return names


METHOD_RE = r"^\s*(?:[\w<>\[\],.?*&:~@]+\s+)+{name}\s*\("  # Java/C#/C++ methods: modifiers or a type first


def _defines(path, text, sym):
    """Whether a file defines `sym` (`name` or `Outer.name`)."""
    last = re.split(r"\.|::", sym)[-1]
    if path.suffix == ".py":
        names = _py_names(text)
        return sym in names or any(n.endswith("." + sym) for n in names)
    import peek
    for rx in (re.compile(peek.DEF_RE.format(name=re.escape(last)), re.M), re.compile(METHOD_RE.format(name=re.escape(last)), re.M)):
        for m in rx.finditer(text):
            line = m.group(0).strip()
            if not re.match(r"(?:return|if|for|while|switch|catch|else|new|await|throw|yield|case)\b", line):
                return True
    return False


def _symbol_index(repo):
    """{file: set of names} from the scanner's outline, with `Class.method` for methods."""
    import scan_repo
    index = {}
    for f in scan_repo.outline(repo, per_file=10 ** 6):
        names, cls = set(), None
        for s in f["symbols"]:
            m = re.search(r"(?:class|def|func|fn|struct|enum|trait|interface|record|impl)\s+(?:\([^)]*\)\s*)?(\w+)", s["sig"]) \
                or re.match(r"(\w+)\s+(?:struct|interface)", s["sig"]) or re.search(r"([\w~]+)\s*\(", s["sig"])
            if not m:
                continue
            name = m.group(1).split("::")[-1]
            if s["depth"] == 0:
                cls = name if s["sig"].startswith("class ") else None
                names.add(name)
            else:
                names.add(f"{cls}.{name}" if cls else name)
                names.add(name)
        index[f["file"]] = names
    return index


def drift(data, repo):
    """Every node `source` that no longer matches the code: missing file, missing symbol,
    a symbol that moved to another file, or a line beyond the end of the file."""
    repo = Path(repo).resolve()
    if str(HERE) not in sys.path:
        sys.path.insert(0, str(HERE))
    out, checked, nodes, index, files = [], 0, 0, None, None
    texts = {}

    def text_of(p):
        if p not in texts:
            try:
                texts[p] = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                texts[p] = ""
        return texts[p]

    def where(sym):
        nonlocal index
        if index is None:
            index = _symbol_index(repo)
        exact = [f for f, names in index.items() if sym in names]
        return exact or [f for f, names in index.items() if re.split(r"\.|::", sym)[-1] in names]

    def same_path(path, sym):
        """Files elsewhere in the repo whose path ends with `path` (and that define `sym`, if given)."""
        nonlocal files
        if files is None:
            import scan_repo
            files = [scan_repo.rel(p, repo) for p in scan_repo.list_files(repo)[0]]
        tail = "/" + path.lstrip("./")
        return [c for c in files if ("/" + c).endswith(tail) and (not sym or _defines(repo / c, text_of(repo / c), sym))]

    for p, n in iter_nodes(data.get("root")):
        srcs = [s for s in n.get("source") or [] if isinstance(s, str) and s.strip() and not re.match(r"^\w+://", s)]
        nodes += bool(srcs)
        for src in srcs:
            checked += 1
            path, a, b, sym = parse_source(src)
            f = repo / path
            if not f.exists() and Path(str(f) + ".py").is_file():
                f = Path(str(f) + ".py")
            item = {"node": "/".join(p), "label": n.get("label"), "source": src}
            if not f.exists():
                cands = same_path(path, sym) or (where(sym) if sym else [])
                if cands and not sym:
                    item.update(problem="moved", detail=f"file is gone; same path under {', '.join(cands[:3])}", candidates=cands[:5])
                elif cands:
                    item.update(problem="moved", detail=f"file is gone; '{sym}' is now in {', '.join(cands[:3])}", candidates=cands[:5])
                else:
                    item.update(problem="missing-file", detail="file not found")
            elif f.is_dir():
                continue
            elif a is not None:
                total = len(text_of(f).splitlines())
                if a > total or b > total or b < a:
                    item.update(problem="line-out-of-range", detail=f"lines {a}-{b} but the file has {total}")
                else:
                    continue
            elif sym:
                if _defines(f, text_of(f), sym):
                    continue
                cands = [c for c in where(sym) if c != path]
                if cands:
                    item.update(problem="moved", detail=f"'{sym}' is now in {', '.join(cands[:3])}", candidates=cands[:5])
                else:
                    item.update(problem="missing-symbol", detail=f"'{sym}' not found in {path}")
            else:
                continue
            out.append(item)
    return {"repo": str(repo), "nodes": nodes, "checked": checked, "drifted": out}


# ---------- diff ----------

DIFF_NODE_FIELDS = ("label", "shape", "role", "source", "note")
DIFF_EDGE_FIELDS = ("label", "style", "arrow")


def _edge_keys(edges):
    """Edges keyed by (from, to, n) where n counts repeats of the same pair."""
    seen, out = Counter(), {}
    for e in edges or []:
        if isinstance(e, dict):
            k = (e.get("from"), e.get("to"))
            out[k + (seen[k],)] = e
            seen[k] += 1
    return out


def _nodes_by_id(level):
    return {n.get("id"): n for n in (level or {}).get("nodes", []) or [] if isinstance(n, dict)}


def diff(old, new):
    """Added, removed and changed nodes and edges, compared by id within each level path."""
    res = {k: {"added": [], "removed": [], "changed": []} for k in ("nodes", "edges")}
    lo, ln = levels(old), levels(new)
    for lp in [p for p in ln if p in lo]:
        on, nn = _nodes_by_id(lo[lp]), _nodes_by_id(ln[lp])
        for i, n in nn.items():
            if i not in on:
                res["nodes"]["added"].append({"level": lp, "id": i, "label": n.get("label")})
                continue
            o = on[i]
            fields = [f for f in DIFF_NODE_FIELDS if o.get(f) != n.get(f)]
            if bool(o.get("children")) != bool(n.get("children")):
                fields.append("children")
            if fields:
                res["nodes"]["changed"].append({"level": lp, "id": i, "label": n.get("label"), "fields": fields})
        res["nodes"]["removed"] += [{"level": lp, "id": i, "label": o.get("label")} for i, o in on.items() if i not in nn]
        oe, ne = _edge_keys(lo[lp].get("edges")), _edge_keys(ln[lp].get("edges"))
        for k, e in ne.items():
            item = _edge_item(lp, k, e)
            if k not in oe:
                res["edges"]["added"].append(item)
            else:
                fields = [f for f in DIFF_EDGE_FIELDS if oe[k].get(f) != e.get(f)]
                if fields:
                    res["edges"]["changed"].append(dict(item, fields=fields))
        res["edges"]["removed"] += [_edge_item(lp, k, e) for k, e in oe.items() if k not in ne]
    return res


def _edge_item(lp, k, e):
    item = {"level": lp, "from": k[0], "to": k[1], "label": e.get("label")}
    if k[2]:
        item["n"] = k[2]  # the n-th repeat of this pair, counting from 0
    return item


def _mark(node, mark):
    node["diff"] = mark
    for _, n in iter_nodes(node.get("children")):
        n["diff"] = mark
    for lv in [node.get("children")] + [n.get("children") for _, n in iter_nodes(node.get("children"))]:
        for e in (lv or {}).get("edges", []) or []:
            e["diff"] = mark


def diff_page_data(old, new, d=None):
    """NEW with removed nodes and edges put back, and `diff` set on everything that differs."""
    d = d or diff(old, new)
    data, lo = copy.deepcopy(new), levels(old)
    ln = levels(data)
    for item in d["nodes"]["removed"]:
        n = copy.deepcopy(_nodes_by_id(lo[item["level"]])[item["id"]])
        _mark(n, "removed")
        ln[item["level"]].setdefault("nodes", []).append(n)
    for kind in ("added", "changed"):
        for item in d["nodes"][kind]:
            n = _nodes_by_id(ln[item["level"]])[item["id"]]
            if kind == "added":
                _mark(n, "added")
            else:
                n["diff"] = "changed"
    for kind in ("added", "changed"):
        for item in d["edges"][kind]:
            lv = ln[item["level"]]
            edges = _edge_keys(lv.get("edges"))
            edges[(item["from"], item["to"], item.get("n", 0))]["diff"] = kind
    for item in d["edges"]["removed"]:
        lv = ln[item["level"]]
        e = _edge_keys(lo[item["level"]].get("edges"))[(item["from"], item["to"], item.get("n", 0))]
        lv.setdefault("edges", []).append(dict(copy.deepcopy(e), diff="removed"))
    return data


def diff_text(d):
    lines = []
    sym = {"added": "+", "removed": "-", "changed": "~"}
    for kind in ("added", "removed", "changed"):
        for n in d["nodes"][kind]:
            where = "/".join(x for x in (n["level"], n["id"]) if x)
            lines.append(f"{sym[kind]} node {where}  {json.dumps(n['label'], ensure_ascii=False)}"
                         + (f"  ({', '.join(n['fields'])})" if n.get("fields") else ""))
    for kind in ("added", "removed", "changed"):
        for e in d["edges"][kind]:
            lines.append(f"{sym[kind]} edge {e['level'] or 'root'}: {e['from']} -> {e['to']}"
                         + (f"  {json.dumps(e['label'], ensure_ascii=False)}" if e.get("label") else "")
                         + (f"  ({', '.join(e['fields'])})" if e.get("fields") else ""))
    c = {k: {x: len(v) for x, v in d[k].items()} for k in d}
    lines.append(f"nodes: {c['nodes']['added']} added, {c['nodes']['removed']} removed, {c['nodes']['changed']} changed; "
                 f"edges: {c['edges']['added']} added, {c['edges']['removed']} removed, {c['edges']['changed']} changed")
    return "\n".join(lines)


# ---------- three-way merge ----------

MISSING = object()


class Merge:
    """Three-way merge of diagram data: `base` is the old generated map, `ours` the human-edited one,
    `theirs` the newly generated one. A field a person changed (ours != base) is kept; otherwise the
    new scan wins. Nodes a person deleted stay deleted; nodes the scan newly found are added."""

    def __init__(self):
        self.conflicts, self.notes, self.stats = [], [], Counter()

    def value(self, b, o, t, where, field):
        if o == b:
            if t != b:
                self.stats["updated"] += 1
            return t
        if t != b and t != o:
            self.conflicts.append({"where": where, "field": field, "base": _v(b), "ours": _v(o), "theirs": _v(t)})
        elif t == b:
            self.stats["kept"] += 1
        return o

    def fields(self, b, o, t, where, nested=None):
        nested, out = nested or {}, {}
        b = b if isinstance(b, dict) else {}
        for k in list(o) + [k for k in t if k not in o]:
            fn = nested.get(k)
            v = fn(b.get(k, MISSING), o.get(k, MISSING), t.get(k, MISSING), where) if fn else \
                self.value(b.get(k, MISSING), o.get(k, MISSING), t.get(k, MISSING), where, k)
            if v is not MISSING:
                out[k] = v
        return out

    def items(self, b, o, t, where, kind, keyf, merge_one):
        """Merge two lists of records matched by key. Returns (merged list, records new from `theirs`)."""
        bm, om, tm = (keyf(x if isinstance(x, list) else []) for x in (b, o, t))
        out, added = [], []
        for k, ov in om.items():
            if k in tm:
                out.append(merge_one(bm.get(k), ov, tm[k], f"{where} > {_k(k)}"))
            elif k not in bm:
                out.append(ov)
            elif ov == bm[k]:
                self.stats["removed"] += 1
            else:
                self.conflicts.append({"where": f"{where} > {_k(k)}", "field": kind,
                                       "ours": "edited", "theirs": "removed by the new scan"})
                out.append(ov)
        for k, tv in tm.items():
            if k in om:
                continue
            if k in bm:
                if tv != bm[k]:
                    self.notes.append(f"{where} > {_k(k)}: you deleted this {kind}; the new scan changed it; it stays deleted")
                continue
            tv = copy.deepcopy(tv)
            out.append(tv)
            added.append(tv)
            self.stats["added"] += 1
        return out, added

    def level(self, b, o, t, where):
        if o is MISSING and t is MISSING:
            return MISSING
        if o is MISSING or o is None:
            if b is MISSING:
                return copy.deepcopy(t)
            if t != b:
                self.notes.append(f"{where}: you removed this inner diagram; the new scan changed it; it stays removed")
            return o
        if t is MISSING or t is None:
            if b is MISSING or o != b:
                if b is not MISSING:
                    self.conflicts.append({"where": where, "field": "children", "ours": "edited", "theirs": "removed by the new scan"})
                return o
            return MISSING
        added = []

        def nodes(bn, on, tn, w):
            out, new = self.items(bn, on, tn, w, "node", _nodes_keyed, self.node)
            added.extend(new)
            return out

        def edges(be, oe, te, w):
            return self.items(be, oe, te, w, "edge", _edge_keys, lambda x, y, z, ww: self.fields(x, y, z, ww))[0]

        def groups(bg, og, tg, w):
            return self.items(bg, og, tg, w, "group", _nodes_keyed, lambda x, y, z, ww: self.fields(x, y, z, ww))[0]

        out = self.fields(b, o, t, where, {"nodes": nodes, "edges": edges, "groups": groups})
        ids = {n.get("id") for n in out.get("nodes", []) if isinstance(n, dict)}
        kept = [e for e in out.get("edges", []) or [] if e.get("from") in ids and e.get("to") in ids]
        if len(kept) < len(out.get("edges", []) or []):
            self.notes.append(f"{where}: dropped {len(out['edges']) - len(kept)} new edge(s) to nodes you deleted")
            out["edges"] = kept
        self.place(out, added, where)
        return out

    def node(self, b, o, t, where):
        return self.fields(b, o, t, where, {"children": self.level})

    def place(self, level, added, where):
        """New nodes get no x/y (auto-layout), unless every other node is placed by hand: then they
        go in a column to the right, so one new node does not re-lay a level someone arranged."""
        if not added:
            return
        for n in added:
            n.pop("x", None)
            n.pop("y", None)
        rest = [n for n in level.get("nodes", []) if all(n is not a for a in added)]
        if rest and all(_num(n.get("x")) and _num(n.get("y")) for n in rest):
            x = max(n["x"] for n in rest) + 220
            y = min(n["y"] for n in rest)
            for i, n in enumerate(added):
                n["x"], n["y"] = x, y + i * 120
            self.notes.append(f"{where or 'root'}: placed {len(added)} new node(s) in a column on the right; use Tidy to re-lay the level")


def _v(x):
    return None if x is MISSING else x


def _k(k):
    return f"{k[0]} -> {k[1]}" if isinstance(k, tuple) else str(k)


def _nodes_keyed(items):
    return {x.get("id"): x for x in items if isinstance(x, dict)}


def merge(base, ours, theirs):
    """Three-way merge; returns (data, Merge report)."""
    m = Merge()
    data = m.fields(base, ours, theirs, "root", {
        "meta": lambda b, o, t, w: m.fields(b, o, t, "meta") if isinstance(o, dict) and isinstance(t, dict) else m.value(b, o, t, w, "meta"),
        "root": lambda b, o, t, w: m.level(b, o, t, "root"),
    })
    return data, m


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
            for item in (m if isinstance(m, list) else [m]):
                if isinstance(item, dict):
                    for k in ("src", "poster"):
                        if k in item:
                            item[k] = conv(item[k])
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
    if a.repo and isinstance(data.get("meta"), dict):
        found = repo_meta(a.repo)
        if not found:
            print(f"warning: {a.repo} is not a git work tree; meta.repo not filled")
        repo = data["meta"].setdefault("repo", {})
        if isinstance(repo, dict):
            for k, v in found.items():
                repo.setdefault(k, v)
            if not repo:
                del data["meta"]["repo"]
        if found and git(a.repo, "status", "--porcelain", "--untracked-files=no"):
            print("warning: the work tree has uncommitted changes; pinned links show the last commit")
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


def planning_status(data):
    """Count nodes tagged `planned` against the rest, per level. Open questions are listed separately."""
    rows, planned, built, questions = [], 0, 0, []
    for lvl_path, level in levels(data).items():
        p = b = 0
        for n in level.get("nodes", []):
            if not isinstance(n, dict) or n.get("shape") in ("text", "initial", "final"):
                continue
            tags = [str(t).lower() for t in (n.get("tags") or [])] + ([str(n["tag"]).lower()] if n.get("tag") else [])
            if "open question" in tags:
                questions.append({"level": lvl_path or "root", "node": n.get("id"), "label": n.get("label")})
            elif "planned" in tags:
                p += 1
            else:
                b += 1
        planned, built = planned + p, built + b
        if p:
            rows.append({"level": lvl_path or "root", "planned": p, "built": b})
    return {"planned": planned, "built": built, "levels": rows, "questions": questions}


def cmd_status(a):
    st = planning_status(_load(a.source))
    if a.json:
        print(json.dumps(st, indent=1, ensure_ascii=False))
        return 0
    total = st["planned"] + st["built"]
    print(f"{st['built']} of {total} parts built, {st['planned']} still planned" + (f", {len(st['questions'])} open question(s)" if st["questions"] else ""))
    for r in st["levels"]:
        print(f"  {r['level']}: {r['planned']} planned, {r['built']} built")
    for q in st["questions"]:
        print(f"  ? {q['level']}: {q['label']}")
    return 0


def cmd_drift(a):
    res = drift(_load(a.diagram), a.repo)
    if a.json:
        print(json.dumps(res, indent=1, ensure_ascii=False))
    elif not res["drifted"]:
        print(f"ok: {res['checked']} sources on {res['nodes']} nodes match the code")
    else:
        print(f"drift: {len(res['drifted'])} of {res['checked']} sources no longer match the code")
        for d in res["drifted"]:
            print(f"  {d['node']}  {d['source']}  {d['problem']}: {d['detail']}")
    return 1 if res["drifted"] else 0


def cmd_diff(a):
    old, new = _load(a.old), _load(a.new)
    d = diff(old, new)
    print(json.dumps(d, indent=1, ensure_ascii=False) if a.json else diff_text(d))
    if a.page:
        data = diff_page_data(old, new, d)
        rep = validate(data)
        if not rep.ok:
            _print_report(rep)
            return 1
        try:
            inline_media(data, Path(a.new).resolve().parent)
        except (FileNotFoundError, ValueError) as e:
            print(f"error: {e}", file=sys.stderr)
            return 1
        Path(a.page).write_text(embed(data, Path(a.template).read_text(encoding="utf-8")), encoding="utf-8")
        print(f"built {a.page}", file=sys.stderr if a.json else sys.stdout)
    return 0


def cmd_merge(a):
    data, m = merge(_load(a.base), _load(a.ours), _load(a.theirs))
    Path(a.output).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    st = m.stats
    print(f"merged {a.output}: {st['added']} added and {st['removed']} removed by the new scan, "
          f"{st['updated']} fields updated, {st['kept']} of your edits kept, {len(m.conflicts)} conflicts")
    for c in m.conflicts:
        print(f"conflict (kept yours): {c['where']}: {c['field']}: yours {json.dumps(c.get('ours'), ensure_ascii=False)}, "
              f"new scan {json.dumps(c.get('theirs'), ensure_ascii=False)}")
    for n in m.notes:
        print(f"note: {n}")
    rep = validate(data)
    for e in rep.errors:
        print(f"error: {e}", file=sys.stderr)
    return 0 if rep.ok else 1


def _ts(v):
    from datetime import datetime, timezone
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def transcript_usage(path, since=None, until=None):
    """Sum the token usage of a Claude Code transcript (JSONL). Each API message is counted once."""
    seen = {}
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        m = d.get("message") if isinstance(d, dict) else None
        u = m.get("usage") if isinstance(m, dict) else None
        if not isinstance(u, dict) or m.get("model") in (None, "<synthetic>"):
            continue
        at = _ts(d.get("timestamp"))
        if at and ((since and at < since) or (until and at > until)):
            continue
        seen[m.get("id") or d.get("uuid") or len(seen)] = (u, m.get("model"))
    tot = {"input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0, "cache_write_tokens": 0}
    models = Counter()
    for u, model in seen.values():
        tot["input_tokens"] += int(u.get("input_tokens") or 0)
        tot["output_tokens"] += int(u.get("output_tokens") or 0)
        tot["cache_read_tokens"] += int(u.get("cache_read_input_tokens") or 0)
        tot["cache_write_tokens"] += int(u.get("cache_creation_input_tokens") or 0)
        models[model] += 1
    tot["model"] = ", ".join(m for m, _ in models.most_common(3))
    tot["messages"] = len(seen)
    return tot


def latest_transcript(cwd=None):
    d = Path.home() / ".claude" / "projects" / re.sub(r"[^A-Za-z0-9]", "-", str(Path(cwd or Path.cwd()).resolve()))
    files = sorted(d.glob("*.jsonl"), key=lambda f: f.stat().st_mtime) if d.is_dir() else []
    return files[-1] if files else None


def cmd_usage(a):
    page = a.target.endswith((".html", ".htm"))
    text = Path(a.target).read_text(encoding="utf-8")
    data = extract(text) if page else _load(a.target)
    gen = {}
    if a.latest or a.transcript:
        src = Path(a.transcript) if a.transcript else latest_transcript()
        if not src or not src.is_file():
            print("error: no Claude Code transcript found; pass --transcript FILE or the numbers with --input-tokens etc.", file=sys.stderr)
            return 1
        since, until = (_ts(a.since) if a.since else None), (_ts(a.until) if a.until else None)
        if (a.since and not since) or (a.until and not until):
            print("error: --since and --until take an ISO time such as 2026-10-27T09:30:00Z", file=sys.stderr)
            return 1
        u = transcript_usage(src, since, until)
        if not u["messages"]:
            print(f"error: no usage found in {src}" + (" for that time window" if since or until else ""), file=sys.stderr)
            return 1
        gen.update({k: u[k] for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens")})
        if u["model"]:
            gen["model"] = u["model"]
        gen["note"] = f"Summed from {u['messages']} model calls in {src.name}" + (f" since {a.since}" if a.since else "") + "."
    for flag, key in (("input_tokens", "input_tokens"), ("output_tokens", "output_tokens"),
                      ("cache_read_tokens", "cache_read_tokens"), ("cache_write_tokens", "cache_write_tokens"),
                      ("duration", "duration_s"), ("agent", "agent"), ("model", "model")):
        if getattr(a, flag) is not None:
            gen[key] = getattr(a, flag)
    if a.note:
        gen["note"] = a.note
    if not any(k in gen for k in ("input_tokens", "output_tokens")):
        print("error: give --latest, --transcript FILE, or --input-tokens/--output-tokens", file=sys.stderr)
        return 1
    gen.setdefault("agent", "Claude Code")
    if a.cost is not None:
        gen["cost"] = a.cost
    elif a.rates:
        try:
            r = [float(x) for x in a.rates.split(",")]
            r += [0.0] * (4 - len(r))
        except ValueError:
            print("error: --rates takes USD per million tokens: INPUT,OUTPUT[,CACHE_WRITE,CACHE_READ]", file=sys.stderr)
            return 1
        gen["cost"] = round(sum(v * x for v, x in zip(
            (gen.get("input_tokens", 0), gen.get("output_tokens", 0), gen.get("cache_write_tokens", 0), gen.get("cache_read_tokens", 0)), r)) / 1e6, 4)
    if "cost" in gen:
        gen["currency"] = a.currency
    from datetime import datetime, timezone
    gen["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    data.setdefault("meta", {})["generation"] = gen
    rep = validate(data)
    _print_report(rep)
    if not rep.ok:
        return 1
    if page:
        Path(a.target).write_text(embed(data, text), encoding="utf-8")
    else:
        Path(a.target).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tot = sum(gen.get(k, 0) for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens"))
    print(f"stamped {a.target}: {tot:,} tokens" + (f", {gen['currency']} {gen['cost']}" if "cost" in gen else ", no cost (pass --cost or --rates)"))
    return 0


ENGINE_RE = re.compile(r'<style id="ss-css">(.*?)</style>.*?<script id="ss-engine">(.*?)</script>', re.S)


def migrate(data):
    """Bring older data to the current schema. Returns how many nodes changed: `tag` becomes `tags`."""
    n = 0
    for _, node in iter_nodes(data.get("root") or {}):
        if isinstance(node.get("tag"), str):
            tag = node.pop("tag")
            if tag.strip():
                node["tags"] = [tag.strip()] + [x for x in node.get("tags", []) if x != tag.strip()]
            n += 1
    return n


def _is_stale(page_text, template_text):
    a, b = ENGINE_RE.search(page_text), ENGINE_RE.search(template_text)
    return not (a and b and a.groups() == b.groups())


def _pages(paths):
    out = []
    for p in map(Path, paths):
        if p.is_dir():
            out += sorted(f for f in p.rglob("*.html") if ".git" not in f.parts and "node_modules" not in f.parts)
        else:
            out.append(p)
    return out


def cmd_upgrade(a):
    tpl = Path(a.template).read_text(encoding="utf-8")
    pages = _pages(a.pages)
    if a.output and len(pages) != 1:
        print("error: -o works with exactly one page", file=sys.stderr)
        return 1
    stale = failed = done = 0
    for f in pages:
        text = f.read_text(encoding="utf-8", errors="replace")
        if not DATA_RE.search(text):
            if not f.is_dir() and len(pages) == 1:
                print(f"error: {f} is not an unfold page", file=sys.stderr)
                return 1
            continue
        old = _is_stale(text, tpl)
        if a.check:
            print(f"{'out of date' if old else 'current':12} {f}")
            stale += old
            continue
        if not old and not a.output:
            print(f"current      {f}")
            continue
        try:
            data = extract(text)
        except ValueError as e:
            print(f"error: {f}: {e}", file=sys.stderr)
            failed += 1
            continue
        migrate(data)
        rep = validate(data)
        if not rep.ok:
            print(f"skipped      {f}: the data does not pass check with this version", file=sys.stderr)
            _print_report(rep)
            failed += 1
            continue
        out = Path(a.output) if a.output else f
        if a.backup and out == f:
            f.with_suffix(f.suffix + ".bak").write_text(text, encoding="utf-8")
        out.write_text(embed(data, tpl), encoding="utf-8")
        print(f"upgraded     {out}")
        done += 1
    if a.check:
        print(f"{stale} of {len(pages)} file(s) out of date" if stale else "all pages are current")
        return 1 if stale else 0
    return 1 if failed else 0


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
    b.add_argument("--repo", metavar="PATH", help="fill missing meta.repo url/commit/root from this git work tree")
    b.set_defaults(fn=cmd_build)
    g = sub.add_parser("upgrade", help="rebuild existing pages with the current engine, keeping their data")
    g.add_argument("pages", nargs="+", metavar="PAGE_OR_DIR", help="pages, or folders searched for pages")
    g.add_argument("--check", action="store_true", help="only list pages whose engine is out of date (exit 1 if any)")
    g.add_argument("--backup", action="store_true", help="keep each replaced page as PAGE.html.bak")
    g.add_argument("-o", "--output", help="write the one upgraded page here instead of in place")
    g.add_argument("--template", default=str(DEFAULT_TEMPLATE))

    t = sub.add_parser("status", help="how many planned parts are built (plan mode)")
    t.add_argument("source")
    t.add_argument("--json", action="store_true")
    t.set_defaults(fn=cmd_status)

    u = sub.add_parser("usage", help="record what the agent session spent on this map (meta.generation)")
    u.add_argument("target", help="diagram JSON or built page; updated in place")
    u.add_argument("--latest", action="store_true", help="read the newest Claude Code transcript of the current folder")
    u.add_argument("--transcript", metavar="FILE", help="a Claude Code transcript (.jsonl)")
    u.add_argument("--since", metavar="TS", help="count only calls at or after this ISO time (when the mapping began)")
    u.add_argument("--until", metavar="TS")
    u.add_argument("--rates", metavar="IN,OUT,CW,CR", help="USD per million tokens: input, output, cache write, cache read")
    u.add_argument("--cost", type=float, help="the cost, if you already know it")
    u.add_argument("--currency", default="USD")
    for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens"):
        u.add_argument("--" + k.replace("_", "-"), dest=k, type=int)
    u.add_argument("--duration", type=float, help="seconds the work took")
    u.add_argument("--agent")
    u.add_argument("--model")
    u.add_argument("--note")
    u.set_defaults(fn=cmd_usage)
    g.set_defaults(fn=cmd_upgrade)

    x = sub.add_parser("extract", help="pull diagram data out of a built page")
    x.add_argument("page")
    x.add_argument("output", nargs="?")
    x.set_defaults(fn=cmd_extract)
    o = sub.add_parser("outline", help="print the nesting as a text tree")
    o.add_argument("source")
    o.set_defaults(fn=cmd_outline)
    d = sub.add_parser("drift", help="report node sources that no longer match the code (exit 1 if any)")
    d.add_argument("diagram")
    d.add_argument("--repo", required=True, metavar="PATH", help="the folder the source paths are relative to")
    d.add_argument("--json", action="store_true")
    d.set_defaults(fn=cmd_drift)
    f = sub.add_parser("diff", help="compare two diagrams by node id per level")
    f.add_argument("old")
    f.add_argument("new")
    f.add_argument("--json", action="store_true")
    f.add_argument("--page", metavar="OUT.html", help="build NEW with removed elements put back and differences marked")
    f.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    f.set_defaults(fn=cmd_diff)
    m = sub.add_parser("merge", help="three-way merge a re-map into an edited diagram, keeping human edits")
    m.add_argument("--base", required=True, help="the previously generated diagram")
    m.add_argument("--ours", required=True, help="the edited diagram (e.g. from extract)")
    m.add_argument("--theirs", required=True, help="the newly generated diagram")
    m.add_argument("-o", "--output", required=True)
    m.set_defaults(fn=cmd_merge)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
