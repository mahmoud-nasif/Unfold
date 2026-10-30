#!/usr/bin/env python3
"""Set the release version everywhere it appears, and open its CHANGELOG section.

    python tools/bump_version.py 0.4.1      # or: make bump V=0.4.1

Updates pyproject.toml, src/unfold_map/__init__.py, .claude-plugin/plugin.json, the engine
banner and VERSION in engine/src/00-core.js, then rebuilds the template and examples. In
CHANGELOG.md the [Unreleased] notes move under a new "## [X.Y.Z] - today" heading.
Merging the result into main publishes the release (.github/workflows/release.yml).
"""
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sub(path, pattern, repl, count=1):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    new, n = re.subn(pattern, repl, text, count=count, flags=re.M)
    if n != count:
        raise SystemExit(f"{path}: expected {count} match(es) for {pattern!r}, found {n}")
    p.write_text(new, encoding="utf-8")


def main(argv):
    if len(argv) != 1 or not re.fullmatch(r"\d+\.\d+\.\d+", argv[0]):
        raise SystemExit("usage: bump_version.py X.Y.Z")
    v = argv[0]
    sub("pyproject.toml", r'^version = "[^"]+"', f'version = "{v}"')
    sub("src/unfold_map/__init__.py", r'^__version__ = "[^"]+"', f'__version__ = "{v}"')
    plugin = ROOT / ".claude-plugin" / "plugin.json"
    data = json.loads(plugin.read_text(encoding="utf-8"))
    data["version"] = v
    plugin.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    sub("engine/src/00-core.js", r"^/\*! unfold engine [\d.]+ \|", f"/*! unfold engine {v} |")
    sub("engine/src/00-core.js", r"^var VERSION='[\d.]+';", f"var VERSION='{v}';")
    log = ROOT / "CHANGELOG.md"
    text = log.read_text(encoding="utf-8")
    if f"## [{v}]" not in text:
        today = datetime.date.today().isoformat()
        text = text.replace("## [Unreleased]\n", f"## [Unreleased]\n\n## [{v}] - {today}\n", 1)
        log.write_text(text, encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "engine" / "assemble.py")], check=True)
    subprocess.run(["make", "-C", str(ROOT), "examples"], check=True)
    print(f"version {v}: commit, open a pull request, and merge it to publish the release")


if __name__ == "__main__":
    main(sys.argv[1:])
