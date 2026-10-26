"""``unfold`` console script: one entry point for the skill's scripts.

    unfold scan    REPO [--outline PREFIX] [--json]       -> scripts/scan_repo.py
    unfold peek    REPO file:symbol file:40-80 ...        -> scripts/peek.py
    unfold check|build|extract|outline|... ARGS           -> scripts/unfold.py
    unfold skill-path                                     -> print the bundled skill folder

Any subcommand that is not ``scan``, ``peek`` or ``skill-path`` is passed to ``unfold.py``
unchanged, so new ``unfold.py`` subcommands work without touching this file.
Standard library only, Python 3.8+.
"""
import runpy
import sys
from pathlib import Path

from . import __version__

SCRIPTS = {"scan": "scan_repo.py", "peek": "peek.py"}
DEFAULT = "unfold.py"


def skill_dir() -> Path:
    """The skill folder: bundled in the wheel, or skill/unfold in a source checkout."""
    here = Path(__file__).resolve().parent
    for cand in (here / "skill", here.parents[1] / "skill" / "unfold"):
        if (cand / "SKILL.md").is_file() and (cand / "scripts" / DEFAULT).is_file():
            return cand
    raise SystemExit("unfold: the bundled skill folder is missing; reinstall unfold-map")


def _usage() -> str:
    return (
        f"unfold {__version__}: map a codebase into a zoomable diagram page\n\n"
        "usage: unfold scan REPO [--outline [PREFIX]] [--json]\n"
        "       unfold peek REPO REF [REF ...]\n"
        "       unfold check DIAGRAM | build DIAGRAM PAGE | extract PAGE [DIAGRAM] | outline SOURCE\n"
        "       unfold skill-path\n\n"
        "Every subcommand other than scan, peek and skill-path goes to unfold.py; "
        "run `unfold check --help` and so on for details."
    )


def run_script(script: Path, argv) -> int:
    """Run a script as __main__ with argv, returning its exit status."""
    old_argv, old_path = sys.argv[:], sys.path[:]
    sys.argv = [str(script)] + list(argv)
    sys.path.insert(0, str(script.parent))
    try:
        runpy.run_path(str(script), run_name="__main__")
    except SystemExit as e:
        code = e.code
        if code is None:
            return 0
        if isinstance(code, int):
            return code
        print(code, file=sys.stderr)
        return 1
    finally:
        sys.argv, sys.path = old_argv, old_path
    return 0


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(_usage())
        return 0 if argv else 2
    if argv[0] in ("-V", "--version"):
        print(f"unfold {__version__}")
        return 0
    cmd, rest = argv[0], argv[1:]
    if cmd == "skill-path":
        print(skill_dir())
        return 0
    scripts = skill_dir() / "scripts"
    if cmd in SCRIPTS:
        return run_script(scripts / SCRIPTS[cmd], rest)
    return run_script(scripts / DEFAULT, argv)


if __name__ == "__main__":
    sys.exit(main())
