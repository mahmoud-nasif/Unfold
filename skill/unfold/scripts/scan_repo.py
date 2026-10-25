#!/usr/bin/env python3
"""Scan a codebase and report what a system diagram needs to be grounded in.

    python scan_repo.py PATH [--json] [--max N]
    python scan_repo.py PATH --outline [PREFIX]   # symbol map: signatures + docstrings, no bodies

Reports, with file:line references:
  * languages, size and top-level layout
  * build and deploy manifests (package.json, pyproject, setup.py, Cargo.toml,
    go.mod, CMakeLists.txt, ROS 2 package.xml and launch files, Dockerfile,
    docker-compose, Makefile)
  * entry points (main functions, console scripts, executables)
  * input/output signals: HTTP routes, ROS 2 topics/services/actions, message
    queues, CLI arguments, environment variables, file reads/writes, databases,
    outbound network calls, hardware access
  * internal dependencies between top-level modules (Python imports and
    relative JS/TS imports)

It is a starting point, not the truth: regex detection misses dynamic code and
can over-report. Read the files it points at before putting anything in a diagram.
Standard library only, Python 3.8+.
"""
import argparse
import ast
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

IGNORE_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "venv", ".venv", "env", "__pycache__", "build", "dist",
    "install", "log", ".tox", ".mypy_cache", ".pytest_cache", "target", "vendor", "third_party",
    ".idea", ".vscode", "site-packages", ".next", ".nuxt", "coverage", ".gradle", "bin", "obj",
}
LANG = {
    ".py": "Python", ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript", ".jsx": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript", ".go": "Go", ".rs": "Rust", ".java": "Java", ".kt": "Kotlin",
    ".c": "C", ".h": "C/C++ header", ".cc": "C++", ".cpp": "C++", ".cxx": "C++", ".hpp": "C/C++ header",
    ".cs": "C#", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift", ".scala": "Scala", ".sh": "Shell",
    ".bash": "Shell", ".lua": "Lua", ".m": "MATLAB/Obj-C", ".r": "R", ".jl": "Julia", ".dart": "Dart",
    ".vue": "Vue", ".svelte": "Svelte", ".sql": "SQL", ".proto": "Protobuf", ".msg": "ROS msg",
    ".srv": "ROS srv", ".action": "ROS action",
}
CODE_EXT = set(LANG)
MAX_BYTES = 1_000_000

# (category, label, regex). The first capture group, when present, is reported as the detail.
SIGNALS = [
    ("http", "route", r"@(?:\w+\.)?(?:get|post|put|delete|patch|route|api_route|websocket)\(\s*['\"]([^'\"]+)"),
    ("http", "route", r"\b(?:app|router|server|api)\.(?:get|post|put|delete|patch|all)\(\s*['\"`]([^'\"`]+)"),
    ("http", "route", r"@(?:Get|Post|Put|Delete|Patch|Request)Mapping\(\s*(?:value\s*=\s*)?\"?([^\")]*)"),
    ("http", "route", r"\bHandleFunc\(\s*\"([^\"]+)"),
    ("ros2", "publisher", r"create_publisher\s*(?:<\s*([\w:]+)\s*>)?\s*\(\s*([\w.]+\s*,\s*)?['\"]([^'\"]+)"),
    ("ros2", "subscription", r"create_subscription\s*(?:<\s*([\w:]+)\s*>)?\s*\(\s*([\w.]+\s*,\s*)?['\"]([^'\"]+)"),
    ("ros2", "service server", r"create_service\s*(?:<\s*[\w:]+\s*>)?\s*\(\s*([\w.]+\s*,\s*)?['\"]([^'\"]+)"),
    ("ros2", "service client", r"create_client\s*(?:<\s*[\w:]+\s*>)?\s*\(\s*([\w.]+\s*,\s*)?['\"]([^'\"]+)"),
    ("ros2", "action server", r"ActionServer\s*(?:<[^>]*>)?\s*\(\s*\w+\s*,\s*[\w.]+\s*,\s*['\"]([^'\"]+)"),
    ("ros2", "action client", r"ActionClient\s*(?:<[^>]*>)?\s*\(\s*\w+\s*,\s*[\w.]+\s*,\s*['\"]([^'\"]+)"),
    ("messaging", "kafka", r"\b(KafkaConsumer|KafkaProducer|AIOKafka\w+|kafka\.Reader|kafka\.Writer)\b"),
    ("messaging", "mqtt", r"\b(?:client|mqtt)\.(subscribe|publish)\(\s*['\"]([^'\"]+)"),
    ("messaging", "amqp/redis pubsub", r"\b(basic_publish|basic_consume|pubsub\(\)|\.psubscribe\()"),
    ("cli", "argument", r"add_argument\(\s*['\"]([^'\"]+)"),
    ("cli", "argument", r"@click\.(?:option|argument)\(\s*['\"]([^'\"]+)"),
    ("cli", "argument", r"\.option\(\s*['\"](-{1,2}[\w-]+)"),
    ("cli", "argument", r"\bflag\.(?:String|Int|Bool|Float64|Duration)\(\s*\"([^\"]+)"),
    ("env", "variable", r"os\.environ(?:\.get)?\s*[\[(]\s*['\"]([A-Z][A-Z0-9_]+)"),
    ("env", "variable", r"\bgetenv\(\s*['\"]([A-Z][A-Z0-9_]+)"),
    ("env", "variable", r"process\.env\.([A-Z][A-Z0-9_]+)"),
    ("env", "variable", r"\bstd::env::var\(\s*\"([A-Z][A-Z0-9_]+)"),
    ("file", "open", r"\bopen\(\s*(?:f?['\"]([^'\"]+)['\"])\s*(?:,\s*['\"]([rwab+xt]+)['\"])?"),
    ("file", "dataframe io", r"\b(read_csv|read_parquet|read_json|to_csv|to_parquet|to_json)\("),
    ("file", "fs", r"\bfs\.(readFile|writeFile|createReadStream|createWriteStream)\w*\("),
    ("database", "client", r"\b(sqlite3\.connect|create_engine|psycopg2?\.connect|asyncpg\.connect|MongoClient|redis\.Redis|Redis\(|mysql\.connector\.connect|sql\.Open|new\s+Pool\(|PrismaClient|mongoose\.connect)\b"),
    ("network", "outbound", r"\b(requests\.(?:get|post|put|delete|patch)|httpx\.\w+|aiohttp\.ClientSession|urllib\.request\.urlopen|axios\.\w+|fetch\(|http\.(?:Get|Post)|grpc\.\w*channel|socket\.socket)\b"),
    ("hardware", "device", r"\b(serial\.Serial|cv2\.VideoCapture|smbus2?\.\w+|spidev|RPi\.GPIO|gpiozero|can\.interface|pyrealsense2|/dev/tty\w+|/dev/video\d+)"),
]
SIGNAL_RES = [(c, l, re.compile(r)) for c, l, r in SIGNALS]
ENTRY_RES = [
    ("Python", re.compile(r"^if\s+__name__\s*==\s*['\"]__main__['\"]")),
    ("Go", re.compile(r"^func\s+main\s*\(\s*\)")),
    ("Rust", re.compile(r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+main\s*\(")),
    ("C/C++", re.compile(r"^\s*int\s+main\s*\(")),
    ("Java", re.compile(r"public\s+static\s+void\s+main\s*\(")),
]


def walk(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORE_DIRS and not d.startswith("."))
        for f in sorted(filenames):
            yield Path(dirpath) / f


def read(p):
    try:
        if p.stat().st_size > MAX_BYTES:
            return None
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def rel(p, root):
    return p.relative_to(root).as_posix()


def manifests(root, files):
    out = []
    for p in files:
        name, r = p.name, rel(p, root)
        text = None
        if name == "package.json":
            try:
                pj = json.loads(read(p) or "{}")
            except json.JSONDecodeError:
                continue
            item = {"file": r, "kind": "npm", "name": pj.get("name")}
            for k in ("main", "bin", "scripts"):
                if pj.get(k):
                    item[k] = pj[k] if k != "scripts" else sorted(pj[k])
            deps = sorted((pj.get("dependencies") or {}).keys())
            if deps:
                item["dependencies"] = deps[:25]
            out.append(item)
        elif name in ("pyproject.toml", "setup.py", "setup.cfg"):
            text = read(p) or ""
            item = {"file": r, "kind": "python"}
            m = re.search(r"^\s*name\s*=\s*['\"]([^'\"]+)", text, re.M) or re.search(r"name\s*=\s*['\"]([^'\"]+)", text)
            if m:
                item["name"] = m.group(1)
            scripts = re.findall(r"^\s*['\"]?([\w.-]+)['\"]?\s*=\s*['\"]?([\w.]+:[\w.]+)", text, re.M)
            scripts += re.findall(r"['\"]([\w.-]+)\s*=\s*([\w.]+:[\w.]+)['\"]", text)
            if scripts:
                item["entry_points"] = sorted({f"{a} = {b}" for a, b in scripts})
            out.append(item)
        elif name in ("requirements.txt",):
            reqs = [ln.split("#")[0].strip() for ln in (read(p) or "").splitlines()]
            out.append({"file": r, "kind": "python requirements", "dependencies": [x for x in reqs if x][:25]})
        elif name == "Cargo.toml":
            text = read(p) or ""
            m = re.search(r'^name\s*=\s*"([^"]+)"', text, re.M)
            out.append({"file": r, "kind": "cargo", "name": m.group(1) if m else None})
        elif name == "go.mod":
            m = re.search(r"^module\s+(\S+)", read(p) or "", re.M)
            out.append({"file": r, "kind": "go", "name": m.group(1) if m else None})
        elif name == "CMakeLists.txt":
            text = read(p) or ""
            item = {"file": r, "kind": "cmake"}
            m = re.search(r"project\s*\(\s*([\w-]+)", text, re.I)
            if m:
                item["name"] = m.group(1)
            ex = re.findall(r"add_executable\s*\(\s*([\w-]+)", text, re.I)
            if ex:
                item["executables"] = ex
            out.append(item)
        elif name == "package.xml":
            text = read(p) or ""
            m = re.search(r"<name>\s*([^<]+)</name>", text)
            deps = re.findall(r"<(?:exec_)?depend>\s*([^<]+)</", text)
            out.append({"file": r, "kind": "ros2 package", "name": m.group(1).strip() if m else None, "dependencies": deps[:25]})
        elif name.endswith((".launch.py", ".launch.xml", ".launch")):
            text = read(p) or ""
            nodes = re.findall(r"executable\s*=\s*['\"]([^'\"]+)", text) + re.findall(r"<node[^>]*exec=\"([^\"]+)", text)
            out.append({"file": r, "kind": "ros2 launch", "executables": sorted(set(nodes))})
        elif name == "Dockerfile" or name.startswith("Dockerfile."):
            text = read(p) or ""
            cmds = re.findall(r"^(ENTRYPOINT|CMD)\s+(.+)$", text, re.M)
            out.append({"file": r, "kind": "docker", "run": [f"{a} {b.strip()}" for a, b in cmds]})
        elif name in ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"):
            text = read(p) or ""
            block = re.search(r"^services:\s*\n((?:[ \t]+.*\n?|\n)*)", text, re.M)
            services = re.findall(r"^  ([\w.-]+):\s*$", block.group(1), re.M) if block else []
            out.append({"file": r, "kind": "compose", "services": services})
        elif name in ("Makefile", "makefile"):
            targets = re.findall(r"^([A-Za-z][\w.-]*):(?!=)", read(p) or "", re.M)
            out.append({"file": r, "kind": "make", "targets": sorted(set(targets))[:30]})
    return out


def python_module(path, root):
    parts = list(Path(rel(path, root)).with_suffix("").parts)
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    for skip in ("src", "lib"):
        if parts and parts[0] == skip and len(parts) > 1:
            parts = parts[1:]
    return ".".join(parts)


def top_group(path_rel, deep=()):
    """Group a file under its top-level folder, or one level deeper for folders listed in `deep`."""
    parts = Path(path_rel).parts
    if len(parts) == 1:
        return "(root)"
    if parts[0] in ("src", "lib", "app", "packages", "pkg", "internal", "cmd") and len(parts) > 2:
        return f"{parts[0]}/{parts[1]}"
    if parts[0] in deep and len(parts) > 2:
        return f"{parts[0]}/{parts[1]}"
    return parts[0]


def choose_deep(rel_paths):
    """Folders that hold most of the code and have several sub-packages get split one level deeper."""
    tops = Counter(top_group(r) for r in rel_paths)
    total = sum(tops.values()) or 1
    deep = set()
    for top, n in tops.items():
        if "/" in top or top == "(root)" or n / total < 0.6:
            continue
        subs = {Path(r).parts[1] for r in rel_paths if Path(r).parts[0] == top and len(Path(r).parts) > 2}
        if len(subs) >= 2:
            deep.add(top)
    return deep


SYMBOL_RES = {
    "js": [re.compile(r"^\s*export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*\(([^)]*)"),
           re.compile(r"^\s*(?:export\s+)?(?:default\s+)?class\s+(\w+)"),
           re.compile(r"^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|\w+)\s*=>"),
           re.compile(r"^\s*(?:async\s+)?function\s+(\w+)\s*\(([^)]*)")],
    "go": [re.compile(r"^func\s+(?:\(([^)]*)\)\s*)?(\w+)\s*\(([^)]*)"), re.compile(r"^type\s+(\w+)\s+(struct|interface)")],
    "rust": [re.compile(r"^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\(([^)]*)"),
             re.compile(r"^\s*(?:pub\s+)?(struct|enum|trait)\s+(\w+)"), re.compile(r"^\s*impl(?:<[^>]*>)?\s+([\w:<>, ]+)")],
    "c": [re.compile(r"^\s*(?:class|struct)\s+(\w+)\s*(?::[^{;]*)?\{?\s*$"),
          re.compile(r"^[\w:<>,*&\s]+?\b((?:\w+::)?~?\w+)\s*\(([^;{}]*)\)\s*(?:const)?\s*(?:override)?\s*\{?\s*$")],
    "java": [re.compile(r"^\s*(?:public|private|protected)?\s*(?:abstract\s+|final\s+)?(?:class|interface|enum|record)\s+(\w+)"),
             re.compile(r"^\s*(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\], ]+\s+(\w+)\s*\(([^)]*)\)")],
}
LANG_FAMILY = {"JavaScript": "js", "TypeScript": "js", "Vue": "js", "Svelte": "js", "Go": "go", "Rust": "rust",
               "C": "c", "C++": "c", "C/C++ header": "c", "Java": "java", "Kotlin": "java", "C#": "java"}
C_SKIP = {"if", "for", "while", "switch", "return", "sizeof", "catch", "else"}


def python_symbols(text):
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError):
        return []
    out = []

    def doc(node):
        d = ast.get_docstring(node)
        return d.strip().splitlines()[0][:90] if d else ""

    def args(fn):
        names = [a.arg for a in fn.args.args if a.arg not in ("self", "cls")]
        if fn.args.vararg:
            names.append("*" + fn.args.vararg.arg)
        if fn.args.kwarg:
            names.append("**" + fn.args.kwarg.arg)
        return ", ".join(names)

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            bases = ", ".join(ast.unparse(b) for b in node.bases) if hasattr(ast, "unparse") else ""
            out.append((node.lineno, 0, f"class {node.name}" + (f"({bases})" if bases else ""), doc(node)))
            for sub in node.body:
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)) and (not sub.name.startswith("_") or sub.name == "__init__"):
                    out.append((sub.lineno, 1, f"def {sub.name}({args(sub)})", doc(sub)))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out.append((node.lineno, 0, f"def {node.name}({args(node)})", doc(node)))
    return out


def regex_symbols(text, family):
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        if len(line) > 220 or line.lstrip().startswith(("//", "#", "*", "/*")):
            continue
        for rx in SYMBOL_RES[family]:
            m = rx.search(line)
            if not m:
                continue
            g = [x for x in m.groups() if x is not None]
            if family == "go" and rx.pattern.startswith("^func"):
                recv, name, params = m.group(1), m.group(2), m.group(3)
                label = f"func {('(' + recv + ') ') if recv else ''}{name}({params.strip()[:60]})"
            elif family == "c" and len(g) >= 2 and "(" in rx.pattern:
                if g[0].split("::")[-1] in C_SKIP:
                    break
                label = f"{g[0]}({g[1].strip()[:60]})"
            elif len(g) >= 2 and family in ("js", "java", "rust") and "(" in rx.pattern:
                label = f"{g[0]}({g[1].strip()[:60]})"
            else:
                label = " ".join(g)[:80]
            out.append((i, 0, label.strip(), ""))
            break
    return out


def outline(root, prefix="", max_files=200, per_file=40):
    """Symbol map: per file, top-level classes/functions with signatures and first docstring lines."""
    root = Path(root).resolve()
    res = []
    for p in walk(root):
        r = rel(p, root)
        if prefix and not r.startswith(prefix):
            continue
        lang = LANG.get(p.suffix.lower())
        if not lang:
            continue
        text = read(p)
        if text is None:
            continue
        syms = python_symbols(text) if lang == "Python" else (regex_symbols(text, LANG_FAMILY[lang]) if lang in LANG_FAMILY else [])
        if syms:
            res.append({"file": r, "lines": len(text.splitlines()), "symbols": [
                {"line": ln, "depth": d, "sig": sig, "doc": dc} for ln, d, sig, dc in syms[:per_file]]})
        if len(res) >= max_files:
            break
    return res


def reading_order(report, limit=12):
    """Rank files by evidence: I/O signals, entry points and how many parts import them."""
    score = Counter()
    for items in report["signals"].values():
        for s in items:
            score[s["at"].rsplit(":", 1)[0]] += 2
    for e in report["entry_points"]:
        score[e["file"]] += 3
    return [{"file": f, "score": n} for f, n in score.most_common(limit)]


def scan(root, max_items=40):
    root = Path(root).resolve()
    files = [p for p in walk(root)]
    langs, lines = Counter(), Counter()
    tops = Counter()
    code_files = []
    for p in files:
        ext = p.suffix.lower()
        name = p.name
        if name.endswith((".launch.py",)):
            ext = ".py"
        if ext in CODE_EXT:
            text = read(p)
            if text is None:
                continue
            n = text.count("\n") + 1
            langs[LANG[ext]] += 1
            lines[LANG[ext]] += n
            code_files.append((p, text))
    deep = choose_deep([rel(p, root) for p, _ in code_files])
    for p, _ in code_files:
        tops[top_group(rel(p, root), deep)] += 1

    entry, signals = [], defaultdict(list)
    for p, text in code_files:
        r = rel(p, root)
        for i, line in enumerate(text.splitlines(), 1):
            s = line.strip()
            if not s or s.startswith(("#", "//", "*", "/*")):
                continue
            for lang, rx in ENTRY_RES:
                if rx.search(line):
                    entry.append({"file": r, "line": i, "lang": lang})
            seen_line = set()
            for cat, label, rx in SIGNAL_RES:
                m = rx.search(line)
                if not m:
                    continue
                groups = [g for g in m.groups() if g] if m.groups() else []
                detail = groups[-1].strip().rstrip(",") if groups else m.group(0)
                if cat == "file" and label == "open":
                    detail = m.group(1)
                    mode = m.group(2) or "r"
                    label = "write" if any(c in mode for c in "wax+") else "read"
                if cat == "ros2":
                    typ = None
                    if label in ("publisher", "subscription"):
                        typ = m.group(1) or (m.group(2) or "").strip().rstrip(",").strip() or None
                    detail = m.group(m.lastindex).strip()
                    if typ:
                        detail = f"{detail}  [{typ}]"
                key = (cat, detail)
                if key in seen_line:
                    continue
                seen_line.add(key)
                if len(signals[cat]) < max_items:
                    signals[cat].append({"kind": label, "detail": detail[:120], "at": f"{r}:{i}"})

    # internal dependency graph between top-level groups
    py_mods = {}
    for p, _ in code_files:
        if p.suffix == ".py":
            py_mods[python_module(p, root)] = top_group(rel(p, root), deep)
    top_names = {m.split(".")[0] for m in py_mods}
    deps = Counter()
    for p, text in code_files:
        r = rel(p, root)
        src = top_group(r, deep)
        if p.suffix == ".py":
            try:
                tree = ast.parse(text)
            except (SyntaxError, ValueError):
                continue
            here = python_module(p, root).split(".")
            for node in ast.walk(tree):
                names = []
                if isinstance(node, ast.Import):
                    names = [a.name for a in node.names]
                elif isinstance(node, ast.ImportFrom):
                    if node.level:
                        base = here[: max(0, len(here) - node.level)]
                        names = [".".join(base + ([node.module] if node.module else []))]
                    elif node.module:
                        names = [node.module]
                for nm in names:
                    if not nm or nm.split(".")[0] not in top_names:
                        continue
                    best = max((m for m in py_mods if nm == m or nm.startswith(m + ".") or m.startswith(nm + ".")), key=len, default=None)
                    if best:
                        dst = py_mods[best]
                        if dst != src:
                            deps[(src, dst)] += 1
        elif p.suffix in (".js", ".jsx", ".ts", ".tsx", ".mjs", ".vue", ".svelte"):
            for m in re.finditer(r"(?:from\s+|require\(\s*|import\(\s*)['\"](\.{1,2}/[^'\"]+)['\"]", text):
                target = (p.parent / m.group(1)).resolve()
                try:
                    dst = top_group(target.relative_to(root).as_posix(), deep)
                except ValueError:
                    continue
                if dst != src:
                    deps[(src, dst)] += 1

    result = {
        "root": str(root),
        "files": len(files),
        "languages": [{"language": k, "files": langs[k], "lines": lines[k]} for k, _ in langs.most_common()],
        "top_level": [{"path": k, "code_files": v} for k, v in tops.most_common()],
        "manifests": manifests(root, files),
        "entry_points": entry[:max_items],
        "signals": dict(signals),
        "dependencies": [{"from": a, "to": b, "imports": c} for (a, b), c in deps.most_common(max_items * 2)],
    }
    result["read_first"] = reading_order(result)
    return result


TITLES = {
    "http": "HTTP routes (inputs)", "ros2": "ROS 2 interfaces", "messaging": "Message queues",
    "cli": "CLI arguments (inputs)", "env": "Environment variables (configuration inputs)",
    "file": "File reads / writes", "database": "Databases", "network": "Outbound network calls",
    "hardware": "Hardware access",
}


def to_markdown(r):
    out = [f"# Scan of `{r['root']}`", "", f"{r['files']} files."]
    out += ["", "## Languages", ""] + [f"- {x['language']}: {x['files']} files, {x['lines']} lines" for x in r["languages"]]
    out += ["", "## Top-level code layout", ""] + [f"- `{x['path']}`: {x['code_files']} code files" for x in r["top_level"]]
    if r["manifests"]:
        out += ["", "## Manifests", ""]
        for m in r["manifests"]:
            extra = {k: v for k, v in m.items() if k not in ("file", "kind")}
            out.append(f"- `{m['file']}` ({m['kind']}): " + "; ".join(f"{k}: {v}" for k, v in extra.items() if v))
    if r["entry_points"]:
        out += ["", "## Entry points", ""] + [f"- `{e['file']}:{e['line']}` ({e['lang']})" for e in r["entry_points"]]
    for cat in TITLES:
        items = r["signals"].get(cat)
        if items:
            out += ["", f"## {TITLES[cat]}", ""] + [f"- {i['kind']}: `{i['detail']}` at `{i['at']}`" for i in items]
    if r["dependencies"]:
        out += ["", "## Internal dependencies (imports between top-level parts)", ""]
        out += [f"- `{d['from']}` uses `{d['to']}` ({d['imports']} imports)" for d in r["dependencies"]]
    if r.get("read_first"):
        out += ["", "## Read these first (most I/O evidence)", ""] + [f"- `{x['file']}`" for x in r["read_first"]]
    out += ["", "_Regex-based: confirm by reading the referenced lines before drawing anything._", ""]
    return "\n".join(out)


def outline_markdown(items):
    out = []
    for f in items:
        out.append(f"{f['file']}  ({f['lines']} lines)")
        for s in f["symbols"]:
            out.append(f"  {'  ' * s['depth']}{s['line']:>5}  {s['sig']}" + (f"  # {s['doc']}" if s["doc"] else ""))
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("path")
    ap.add_argument("--outline", nargs="?", const="", metavar="PREFIX",
                    help="print a symbol map (signatures + first docstring line) instead, optionally under PREFIX")
    ap.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    ap.add_argument("--max", type=int, default=40, help="cap per category (default 40)")
    a = ap.parse_args(argv)
    if not Path(a.path).is_dir():
        sys.exit(f"error: {a.path} is not a directory")
    if a.outline is not None:
        items = outline(a.path, a.outline)
        print(json.dumps(items, indent=1) if a.json else outline_markdown(items))
        return 0
    r = scan(a.path, a.max)
    print(json.dumps(r, indent=1) if a.json else to_markdown(r))
    return 0


if __name__ == "__main__":
    sys.exit(main())
