"""Tests for the install channels: install.sh, the Claude Code plugin manifests and the unfold-map CLI.
Each test reads Given / When / Then."""
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skill" / "unfold"
INSTALL_SH = ROOT / "install.sh"
EXAMPLE = ROOT / "examples" / "unfold" / "diagram.json"
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")  # plugin id rule, code.claude.com/docs/en/plugins/marketplace-reference

sys.path.insert(0, str(ROOT / "src"))
from unfold_map import __version__, cli  # noqa: E402

needs_sh = pytest.mark.skipif(os.name == "nt" or not shutil.which("sh"), reason="install.sh needs a POSIX shell")


def _pyproject_version():
    m = re.search(r'^version\s*=\s*"([^"]+)"', (ROOT / "pyproject.toml").read_text(encoding="utf-8"), re.M)
    return m.group(1)


# --- install.sh -------------------------------------------------------------------------------

def _install(home, *args, cwd=ROOT):
    env = dict(os.environ, HOME=str(home))
    return subprocess.run(["sh", str(INSTALL_SH), *args], cwd=str(cwd), env=env, capture_output=True, text=True)


@needs_sh
def test_install_sh_dry_run_changes_nothing(tmp_path):
    # Given a clean HOME where Claude Code and Codex are installed
    (tmp_path / ".claude").mkdir()
    (tmp_path / ".codex").mkdir()
    # When install.sh runs with --dry-run from this checkout
    r = _install(tmp_path, "--from", ".", "--dry-run")
    # Then it names both skills folders and writes nothing
    assert r.returncode == 0, r.stderr
    assert "would: install" in r.stdout
    assert str(tmp_path / ".claude" / "skills" / "unfold") in r.stdout
    assert str(tmp_path / ".agents" / "skills" / "unfold") in r.stdout
    assert not (tmp_path / ".claude" / "skills").exists()
    assert not (tmp_path / ".agents").exists()


@needs_sh
def test_install_sh_installs_idempotently_and_uninstalls(tmp_path):
    # Given a clean HOME with Claude Code
    (tmp_path / ".claude").mkdir()
    target = tmp_path / ".claude" / "skills" / "unfold"
    # When install.sh runs twice
    for _ in range(2):
        r = _install(tmp_path, "--from", ".", "--agent", "claude-code")
        assert r.returncode == 0, r.stderr
    # Then the skill is there once, without evals or caches, and validates the example
    assert (target / "SKILL.md").is_file()
    assert (target / "assets" / "template.html").is_file()
    assert not (target / "evals").exists()
    assert not list(target.rglob("__pycache__"))
    assert [p.name for p in target.parent.iterdir()] == ["unfold"]
    chk = subprocess.run([sys.executable, str(target / "scripts" / "unfold.py"), "check", str(EXAMPLE)], capture_output=True, text=True)
    assert chk.returncode == 0, chk.stderr
    # When it uninstalls, then the folder is gone
    r = _install(tmp_path, "--uninstall", "--agent", "claude-code")
    assert r.returncode == 0, r.stderr
    assert not target.exists()


@needs_sh
def test_install_sh_never_overwrites_a_foreign_folder(tmp_path):
    # Given an unrelated folder that happens to be called "unfold"
    foreign = tmp_path / ".kiro" / "skills" / "unfold"
    foreign.mkdir(parents=True)
    (foreign / "notes.txt").write_text("mine", encoding="utf-8")
    # When install.sh targets that agent
    r = _install(tmp_path, "--from", ".", "--agent", "kiro")
    # Then it refuses and leaves the folder alone
    assert r.returncode != 0
    assert (foreign / "notes.txt").read_text(encoding="utf-8") == "mine"


@needs_sh
def test_install_sh_project_level_and_zip_source(tmp_path):
    # Given a packaged unfold.zip and a project directory
    sys.path.insert(0, str(ROOT / "tools"))
    import package
    zp = package.package(SKILL, tmp_path / "dist").with_suffix(".zip")
    proj = tmp_path / "proj"
    proj.mkdir()
    # When install.sh installs from the zip at project level for Cursor
    r = _install(tmp_path / "home", "--project", "--agent", "cursor", "--from", str(zp), cwd=proj)
    # Then the skill lands in the project's shared .agents/skills folder
    assert r.returncode == 0, r.stderr
    assert (proj / ".agents" / "skills" / "unfold" / "SKILL.md").is_file()


@needs_sh
def test_install_sh_rejects_unknown_agents(tmp_path):
    r = _install(tmp_path, "--from", ".", "--agent", "notanagent", "--dry-run")
    assert r.returncode != 0 and "unknown agent" in r.stderr


# --- Claude Code plugin marketplace -------------------------------------------------------------

def test_marketplace_manifest_has_documented_fields():
    # Given .claude-plugin/marketplace.json (fields from code.claude.com/docs/en/plugins/marketplace-reference)
    m = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    # Then the required name, owner.name and plugins are present and well formed
    assert NAME_RE.match(m["name"]) and ".." not in m["name"]
    assert m["owner"]["name"]
    assert len(m["plugins"]) == 1
    entry = m["plugins"][0]
    assert NAME_RE.match(entry["name"])
    assert entry["source"].startswith("./") and ".." not in entry["source"]
    assert (ROOT / entry["source"] / ".claude-plugin" / "plugin.json").is_file()


def test_plugin_manifest_points_at_the_skill_and_matches_versions():
    # Given .claude-plugin/plugin.json (fields from code.claude.com/docs/en/plugins/manifest-reference)
    p = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    entry = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))["plugins"][0]
    # Then the names agree, every skills path exists and holds a SKILL.md, and the versions agree
    assert p["name"] == entry["name"] == "unfold"
    for s in p["skills"]:
        assert s.startswith("./") and ".." not in s
        assert (ROOT / s / "SKILL.md").is_file()
    assert p["version"] == _pyproject_version() == __version__


# --- unfold-map CLI ----------------------------------------------------------------------------

def test_cli_finds_the_skill_in_a_checkout():
    assert cli.skill_dir().resolve() == SKILL.resolve()


def test_cli_dispatches_check_to_unfold_py(capsys):
    # Given the example, when `unfold check` runs, then it validates through unfold.py
    assert cli.main(["check", str(EXAMPLE)]) == 0
    assert "ok:" in capsys.readouterr().out


def test_cli_dispatches_scan_and_peek(capsys, tmp_path):
    # Given a tiny repo
    (tmp_path / "app.py").write_text("def main():\n    return 1\n", encoding="utf-8")
    # When scan and peek run, then each reaches its own script
    assert cli.main(["scan", str(tmp_path)]) == 0
    assert "Python" in capsys.readouterr().out
    assert cli.main(["peek", str(tmp_path), "app.py:main"]) == 0
    assert "def main" in capsys.readouterr().out


def test_cli_passes_unknown_subcommands_through(capsys):
    # Given a subcommand the wrapper does not know, then unfold.py receives it and reports the error
    assert cli.main(["no-such-command"]) == 2
    assert "invalid choice" in capsys.readouterr().err


def test_cli_help_and_version(capsys):
    assert cli.main(["--version"]) == 0
    assert __version__ in capsys.readouterr().out
    assert cli.main([]) == 2


def test_wheel_ships_the_skill_without_evals(tmp_path):
    # Given a copy of the sources a wheel is built from
    src = tmp_path / "src-tree"
    src.mkdir()
    for name in ("pyproject.toml", "README.md", "LICENSE"):
        shutil.copy(ROOT / name, src / name)
    shutil.copytree(ROOT / "src", src / "src", ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copytree(SKILL, src / "skill" / "unfold", ignore=shutil.ignore_patterns("__pycache__"))
    # When pip builds a wheel (needs network for setuptools unless it is cached)
    r = subprocess.run([sys.executable, "-m", "pip", "wheel", ".", "--no-deps", "-w", str(tmp_path / "out")],
                       cwd=str(src), capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        tail = (r.stderr.strip().splitlines() or [""])[-1]
        pytest.skip(f"pip could not build the wheel here (offline?): {tail}")
    whl = next((tmp_path / "out").glob("unfold_map-*.whl"))
    names = zipfile.ZipFile(whl).namelist()
    # Then the template, scripts and entry point are inside, and evals are not
    for need in ("unfold_map/cli.py", "unfold_map/skill/SKILL.md", "unfold_map/skill/assets/template.html",
                 "unfold_map/skill/scripts/unfold.py", "unfold_map/skill/scripts/scan_repo.py",
                 "unfold_map/skill/scripts/peek.py", "unfold_map/skill/references/schema.md"):
        assert need in names
    assert not any("/evals/" in n for n in names)
    ep = next(n for n in names if n.endswith("entry_points.txt"))
    assert "unfold = unfold_map.cli:main" in zipfile.ZipFile(whl).read(ep).decode()
