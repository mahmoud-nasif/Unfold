"""Release tooling: versions agree everywhere, and each version's CHANGELOG notes can be extracted."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import release_notes  # noqa: E402


def _pyproject_version():
    return re.search(r'^version = "([^"]+)"', (ROOT / "pyproject.toml").read_text(encoding="utf-8"), re.M).group(1)


def test_every_version_string_agrees():
    v = _pyproject_version()
    engine = (ROOT / "engine" / "src" / "00-core.js").read_text(encoding="utf-8")
    assert f"/*! unfold engine {v} |" in engine and f"var VERSION='{v}';" in engine
    assert json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text())["version"] == v
    assert f'__version__ = "{v}"' in (ROOT / "src" / "unfold_map" / "__init__.py").read_text(encoding="utf-8")


def test_the_current_version_has_release_notes():
    # Given the version in pyproject.toml, when the release workflow asks for its notes, then CHANGELOG.md has them
    v = _pyproject_version()
    notes = release_notes.notes(v, (ROOT / "CHANGELOG.md").read_text(encoding="utf-8"))
    assert notes and "## [" not in notes


def test_notes_stop_at_the_next_version():
    text = "# Changelog\n\n## [Unreleased]\n\n## [1.1.0] - 2026-01-02\n\n### Fixed\n- a\n\n## [1.0.0] - 2026-01-01\n\n- b\n"
    assert release_notes.notes("1.1.0", text) == "### Fixed\n- a"
    assert release_notes.notes("1.0.0", text) == "- b"
    assert release_notes.notes("2.0.0", text) == ""
