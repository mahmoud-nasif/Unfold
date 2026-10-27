#!/usr/bin/env python3
"""Print the CHANGELOG.md section for one version, for the GitHub release body.

    python tools/release_notes.py 0.4.0 > notes.md
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def notes(version, text):
    m = re.search(rf"^## \[{re.escape(version)}\][^\n]*\n(.*?)(?=^## \[|\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


if __name__ == "__main__":
    body = notes(sys.argv[1], (ROOT / "CHANGELOG.md").read_text(encoding="utf-8"))
    if not body:
        raise SystemExit(f"CHANGELOG.md has no section for {sys.argv[1]}")
    print(body)
