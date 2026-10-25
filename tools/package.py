#!/usr/bin/env python3
"""Package skill/unfold into dist/unfold.zip and dist/unfold.skill.

Both files have the same contents: a zip holding the skill folder. claude.ai
accepts the .zip as a custom skill upload; the .skill name is what Claude's own
skill tooling produces.

    python tools/package.py [--out dist]

Validates the SKILL.md frontmatter first, using the same rules claude.ai applies
on upload: allowed keys only, kebab-case name, description under 1024 chars with
no angle brackets, and exactly one SKILL.md. The evals/ folder and caches are
left out of the package.
"""
import argparse
import re
import shutil
import sys
import zipfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skill" / "unfold"
ALLOWED_KEYS = {"name", "description", "license", "allowed-tools", "metadata", "compatibility"}
EXCLUDE_DIRS = {"__pycache__", "node_modules", ".pytest_cache"}
EXCLUDE_ROOT_DIRS = {"evals"}
EXCLUDE_FILES = {".DS_Store"}


def frontmatter(skill_md: Path) -> dict:
    text = skill_md.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        raise ValueError("SKILL.md has no YAML frontmatter")
    fm = yaml.safe_load(m.group(1))
    if not isinstance(fm, dict):
        raise ValueError("frontmatter must be a mapping")
    return fm


def validate(skill_dir: Path) -> list:
    problems = []
    md = skill_dir / "SKILL.md"
    if not md.exists():
        return ["SKILL.md not found"]
    try:
        fm = frontmatter(md)
    except (ValueError, yaml.YAMLError) as e:
        return [str(e)]
    extra = set(fm) - ALLOWED_KEYS
    if extra:
        problems.append(f"unexpected frontmatter keys: {sorted(extra)}")
    name = fm.get("name", "")
    if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name) or len(name) > 64:
        problems.append("name must be kebab-case, at most 64 chars")
    if name != skill_dir.name:
        problems.append(f"name '{name}' must match the folder name '{skill_dir.name}'")
    desc = fm.get("description", "")
    if not isinstance(desc, str) or not desc.strip():
        problems.append("description is required")
    else:
        if len(desc) > 1024:
            problems.append(f"description is {len(desc)} chars; the limit is 1024")
        if "<" in desc or ">" in desc:
            problems.append("description must not contain angle brackets")
    nested = [p for p in skill_dir.rglob("SKILL.md") if p != md and included(p.relative_to(skill_dir))]
    if nested:
        problems.append(f"only one SKILL.md allowed; also found {[str(p) for p in nested]}")
    return problems


def included(rel: Path) -> bool:
    parts = rel.parts
    if any(p in EXCLUDE_DIRS for p in parts):
        return False
    if parts and parts[0] in EXCLUDE_ROOT_DIRS:
        return False
    if rel.name in EXCLUDE_FILES or rel.suffix == ".pyc":
        return False
    return True


def package(skill_dir: Path, out_dir: Path) -> Path:
    problems = validate(skill_dir)
    if problems:
        raise SystemExit("cannot package:\n  " + "\n  ".join(problems))
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"{skill_dir.name}.skill"
    files = sorted(p for p in skill_dir.rglob("*") if p.is_file() and included(p.relative_to(skill_dir)))
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            # Fixed timestamp so the archive is reproducible.
            info = zipfile.ZipInfo(str(Path(skill_dir.name) / f.relative_to(skill_dir)), (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o755 if f.suffix == ".py" else 0o644) << 16
            z.writestr(info, f.read_bytes())
    shutil.copyfile(target, target.with_suffix(".zip"))
    return target


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", default=str(ROOT / "dist"))
    a = ap.parse_args()
    t = package(SKILL_DIR, Path(a.out))
    with zipfile.ZipFile(t) as z:
        n = len(z.namelist())
    print(f"packaged {t} and {t.with_suffix('.zip')} ({n} files, {t.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    sys.exit(main())
