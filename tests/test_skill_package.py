"""Tests for the skill folder and tools/package.py."""
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skill" / "unfold"
sys.path.insert(0, str(ROOT / "tools"))
import package  # noqa: E402


def test_skill_passes_upload_validation():
    # Given the skill folder, when validated with claude.ai's upload rules, then nothing is reported
    assert package.validate(SKILL) == []


def test_every_reference_named_in_skill_md_exists():
    # Given every relative path mentioned in SKILL.md
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    paths = set(re.findall(r"`((?:references|scripts|assets)/[^`\s]+)`", text))
    # Then each one is present in the skill
    assert paths, "expected SKILL.md to point at its bundled files"
    missing = [p for p in paths if not (SKILL / p).exists()]
    assert missing == []


def test_skill_md_stays_compact():
    # Given SKILL.md is loaded on every trigger, then it stays well under the 500-line guidance
    assert len((SKILL / "SKILL.md").read_text(encoding="utf-8").splitlines()) < 200


def test_package_contains_skill_and_excludes_evals(tmp_path):
    # Given the skill, when packaged
    target = package.package(SKILL, tmp_path)
    names = zipfile.ZipFile(target).namelist()
    # Then the essentials are inside one top-level folder and evals are left out
    for need in ("SKILL.md", "assets/template.html", "scripts/unfold.py", "scripts/scan_repo.py", "scripts/peek.py", "references/schema.md", "references/reading-code.md"):
        assert f"unfold/{need}" in names
    assert all(n.startswith("unfold/") for n in names)
    assert not any("/evals/" in n or "__pycache__" in n for n in names)


def test_package_is_reproducible(tmp_path):
    # Given two packaging runs of the same tree, then the archives are identical
    a = package.package(SKILL, tmp_path / "a").read_bytes()
    b = package.package(SKILL, tmp_path / "b").read_bytes()
    assert a == b


def test_bad_description_is_rejected(tmp_path):
    # Given a copy of the skill whose description contains angle brackets
    import shutil
    copy = tmp_path / "unfold"
    shutil.copytree(SKILL, copy)
    md = copy / "SKILL.md"
    md.write_text(md.read_text(encoding="utf-8").replace("description: ", "description: <b> ", 1), encoding="utf-8")
    # When validated, then the problem is named
    assert any("angle brackets" in p for p in package.validate(copy))
