#!/usr/bin/env python3
"""Print only the code you need: windows around file:line, file:start-end or file:symbol.

    python peek.py ROOT REF [REF ...] [--context N] [--max LINES] [--budget TOKENS]

REF examples:
    orderly/worker/main.py:10          10 lines either side of line 10 (see --context)
    orderly/worker/main.py:8-24        exactly lines 8 to 24
    orderly/worker/main.py:handle      the definition of `handle` to the end of its block
    orderly/api/routes.py              the whole file (subject to --max)

Overlapping windows in one file are merged. Output stops at --max lines or --budget
tokens (about 4 characters each), whichever comes first, so a reading pass has a fixed
cost; the last line reports the approximate tokens printed. Prefer file:symbol over
wide line ranges. Standard library only, Python 3.8+.
"""
import argparse
import re
import sys
from pathlib import Path

DEF_RE = r"^(\s*)(?:async\s+def|def|class|func|fn|pub\s+fn|pub\s+async\s+fn|function|export\s+(?:default\s+)?(?:async\s+)?function|(?:export\s+)?const|struct|impl|interface|type)\s+(?:\([^)]*\)\s*)?{name}\b"


def block_end(lines, start, indent):
    """End of a definition: Python by indentation, brace languages by brace balance."""
    first = lines[start]
    if first.rstrip().endswith(":") or re.match(r"\s*(async\s+def|def|class)\b", first):
        end = start + 1
        while end < len(lines) and (not lines[end].strip() or len(lines[end]) - len(lines[end].lstrip()) > indent):
            end += 1
        while end > start + 1 and not lines[end - 1].strip():
            end -= 1
        return end
    depth, seen = 0, False
    for i in range(start, min(len(lines), start + 400)):
        depth += lines[i].count("{") - lines[i].count("}")
        seen = seen or "{" in lines[i]
        if seen and depth <= 0:
            return i + 1
    return min(len(lines), start + 40)


def resolve(root, ref, context):
    m = re.match(r"^(.*?):(\d+)(?:-(\d+))?$", ref)
    if m:
        f, a, b = m.group(1), int(m.group(2)), m.group(3)
        return f, (a, int(b)) if b else (max(1, a - context), a + context)
    m = re.match(r"^(.*\.\w+):([A-Za-z_][\w.]*)$", ref)
    if m:
        f, sym = m.group(1), m.group(2).split(".")[-1]
        lines = (Path(root) / f).read_text(encoding="utf-8", errors="replace").splitlines()
        rx = re.compile(DEF_RE.format(name=re.escape(sym)))
        for i, line in enumerate(lines):
            mm = rx.match(line)
            if mm:
                return f, (i + 1, block_end(lines, i, len(mm.group(1))))
        raise LookupError(f"symbol '{sym}' not found in {f}")
    return ref, (1, 10 ** 9)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("root")
    ap.add_argument("refs", nargs="+")
    ap.add_argument("--context", type=int, default=10)
    ap.add_argument("--max", type=int, default=400, help="total line budget (default 400)")
    ap.add_argument("--budget", type=int, default=4000, metavar="TOKENS",
                    help="total token budget, ~4 chars each (default 4000; 0 = no cap)")
    a = ap.parse_args(argv)
    spans, errors = {}, []
    for ref in a.refs:
        try:
            f, (s, e) = resolve(a.root, ref, a.context)
        except (LookupError, OSError) as ex:
            errors.append(str(ex))
            continue
        spans.setdefault(f, []).append([s, e])
    budget, chars = a.max, (a.budget * 4 - 120 if a.budget else float("inf"))  # reserve room for the trailer
    out, stopped = [], None

    def emit(line):
        nonlocal chars
        out.append(line)
        chars -= len(line) + 1

    for f, ranges in spans.items():
        p = Path(a.root) / f
        try:
            lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError as ex:
            errors.append(str(ex))
            continue
        ranges.sort()
        merged = []
        for s, e in ranges:
            e = min(e, len(lines))
            if merged and s <= merged[-1][1] + 2:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
        emit(f"== {f} ({len(lines)} lines)")
        for s, e in merged:
            if budget <= 0 or chars <= 0:
                break
            e = min(e, s + budget - 1)
            for n in range(s, e + 1):
                line = f"{n:>5}  {lines[n - 1]}"
                if len(line) + 1 > chars:
                    e = n - 1
                    stopped = f"{a.budget}-token budget"
                    break
                emit(line)
            budget -= e - s + 1
            emit("   ...")
        if budget <= 0:
            stopped = stopped or f"{a.max}-line budget"
        if stopped:
            emit(f"[stopped: {stopped} reached; peek a narrower symbol or range]")
            break
    text = "\n".join(out)
    if out:
        print(text)
        print(f"[≈{(len(text) + 3) // 4} tokens, {a.max - max(budget, 0)} of {a.max} lines"
              + (f", budget {a.budget} tokens]" if a.budget else "]"))
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    return 1 if errors and not spans else 0


if __name__ == "__main__":
    sys.exit(main())
