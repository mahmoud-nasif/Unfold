#!/usr/bin/env python3
"""Regenerate docs/images/* from examples/unfold (needs playwright and ffmpeg)."""
import shutil
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "examples" / "unfold" / "index.html").as_uri()
OUT = ROOT / "docs" / "images"


def gif(video, target, start=0.5):
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-y", "-ss", str(start), "-i", str(video), "-vf",
        "fps=12,scale=820:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];"
        "[b][p]paletteuse=dither=none:diff_mode=rectangle", str(target)], check=True)


def close_about(pg):
    if pg.locator("#ss-about").is_visible():
        pg.click('[data-act="about-close"]')
        pg.wait_for_timeout(700)


def record(browser, script):
    d = Path(tempfile.mkdtemp())
    ctx = browser.new_context(viewport={"width": 1280, "height": 760}, record_video_dir=str(d),
                              record_video_size={"width": 1280, "height": 760})
    pg = ctx.new_page()
    pg.goto(PAGE)
    pg.wait_for_timeout(1600)
    close_about(pg)
    script(pg)
    ctx.close()
    return next(d.glob("*.webm")), d


def explore(pg):
    pg.hover('.node[data-id="scanner"]'); pg.wait_for_timeout(1300)
    pg.mouse.move(640, 700); pg.wait_for_timeout(300)
    pg.click('.node[data-id="template"]'); pg.wait_for_timeout(1900)
    pg.hover('.node[data-id="layout"]'); pg.wait_for_timeout(1100)
    pg.click('.node[data-id="editor"]'); pg.wait_for_timeout(1900)
    pg.click('.node[data-id="cross"]'); pg.wait_for_timeout(1200)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(1300)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(1700)
    pg.click('.node[data-id="request"]'); pg.wait_for_timeout(2300)
    pg.mouse.move(640, 400)
    for _ in range(12):
        pg.mouse.wheel(0, 240); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1700)
    pg.click('.node[data-id="diagram"]'); pg.wait_for_timeout(2300)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(1500)


def edit(pg):
    pg.click('[data-act="mode-edit"]'); pg.wait_for_timeout(700)
    b = pg.locator('#ss-palette [data-shape="cylinder"]').bounding_box()
    pg.mouse.move(b["x"] + 20, b["y"] + 19); pg.mouse.down()
    pg.mouse.move(560, 640, steps=20); pg.mouse.up(); pg.wait_for_timeout(200)
    for ch in "Cache":
        pg.keyboard.type(ch); pg.wait_for_timeout(70)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    p = pg.locator('.node[data-id="build"] .port[data-port="b"]')
    pg.click('.node[data-id="build"]'); pg.wait_for_timeout(300)
    bb = p.bounding_box()
    pg.mouse.move(bb["x"] + 6, bb["y"] + 6); pg.mouse.down()
    pg.mouse.move(bb["x"] + 90, bb["y"] + 170, steps=20); pg.mouse.up(); pg.wait_for_timeout(200)
    for ch in "Validation report":
        pg.keyboard.type(ch); pg.wait_for_timeout(45)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    pg.click('[data-act="pop"][data-arg="shape"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="set-shape"][data-arg="document"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="role"][data-arg="output"]'); pg.wait_for_timeout(700)
    pg.click('.node[data-id="scanner"]'); pg.click('.node[data-id="claude"]', modifiers=["Shift"]); pg.wait_for_timeout(600)
    pg.click('[data-act="nest-sel"]'); pg.wait_for_timeout(200)
    for ch in "Analysis":
        pg.keyboard.type(ch); pg.wait_for_timeout(70)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(700)
    pg.click('[data-act="tidy"]'); pg.wait_for_timeout(1500)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*"):
        old.unlink()
    with sync_playwright() as p:
        b = p.chromium.launch()
        v, d = record(b, explore); gif(v, OUT / "explore.gif"); shutil.rmtree(d, ignore_errors=True)
        v, d = record(b, edit); gif(v, OUT / "edit.gif", 1.2); shutil.rmtree(d, ignore_errors=True)
        pg = b.new_page(viewport={"width": 1440, "height": 860}); pg.goto(PAGE); pg.wait_for_timeout(1500)
        pg.screenshot(path=str(OUT / "overview.png"))
        close_about(pg)
        for node, name in (("claude", "process.png"), ("request", "sequence.png"), ("diagram", "data.png")):
            pg.click(f'.node[data-id="{node}"]'); pg.wait_for_timeout(1900)
            pg.screenshot(path=str(OUT / name))
            pg.keyboard.press("Escape"); pg.wait_for_timeout(1700)
        pg.click('.node[data-id="template"]'); pg.wait_for_timeout(1900)
        pg.click('.node[data-id="modes"]'); pg.wait_for_timeout(1900)
        pg.screenshot(path=str(OUT / "state.png"))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(1700); pg.keyboard.press("Escape"); pg.wait_for_timeout(1700)
        pg.click('[data-act="mode-edit"]'); pg.wait_for_timeout(600)
        pg.click('.node[data-id="peek"]'); pg.click('[data-act="pop"][data-arg="shape"]'); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / "editor.png"))
        pg = b.new_page(viewport={"width": 1440, "height": 860}, color_scheme="dark"); pg.goto(PAGE); pg.wait_for_timeout(1500)
        close_about(pg)
        pg.hover('.node[data-id="peek"]'); pg.wait_for_timeout(800)
        pg.screenshot(path=str(OUT / "trace-dark.png"))
        b.close()
    print("updated", ", ".join(sorted(f.name for f in OUT.iterdir())))


if __name__ == "__main__":
    main()
