#!/usr/bin/env python3
"""Assemble skill/unfold/assets/template.html from engine/engine.css, engine.js, icons.js and sample.json.

    python engine/assemble.py          # write the template
    python engine/assemble.py --check  # exit 1 if the committed template is out of date
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE.parent / "skill" / "unfold" / "assets" / "template.html"
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700'
         '&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">\n')


def assemble():
    js = (HERE / "engine.js").read_text(encoding="utf-8")
    js = js.replace("//@@ICONS@@", (HERE / "icons.js").read_text(encoding="utf-8").rstrip("\n"))
    if "</script" in js:
        raise SystemExit("engine.js must not contain a literal closing script tag; write <\\/script>")
    css = (HERE / "engine.css").read_text(encoding="utf-8")
    sample = json.loads((HERE / "sample.json").read_text(encoding="utf-8"))
    data = json.dumps(sample, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<title>Unfold</title>\n' + FONTS +
            '<style id="ss-css">\n' + css + '</style>\n</head>\n<body>\n<div id="app"></div>\n'
            '<script type="application/json" id="story-data">' + data + '</script>\n'
            '<script id="ss-engine">\n' + js + '</script>\n</body>\n</html>\n')


if __name__ == "__main__":
    html = assemble()
    if "--check" in sys.argv:
        ok = TARGET.read_text(encoding="utf-8") == html
        print("template is up to date" if ok else "template is stale: run make engine")
        sys.exit(0 if ok else 1)
    TARGET.write_text(html, encoding="utf-8")
    print(f"wrote {TARGET.relative_to(HERE.parent)} ({len(html) // 1024} KB)")
