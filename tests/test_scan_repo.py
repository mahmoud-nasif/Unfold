"""Tests for scripts/scan_repo.py against a small mixed-language fixture repository."""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "skill" / "unfold" / "scripts" / "scan_repo.py"
sys.path.insert(0, str(SCAN.parent))
import scan_repo  # noqa: E402

FILES = {
    "app/__init__.py": "",
    "app/api/__init__.py": "",
    "app/core/__init__.py": "",
    "app/api/routes.py": (
        "import os\nfrom fastapi import FastAPI\nfrom app.core.engine import run\napp = FastAPI()\n"
        "TOKEN = os.environ.get('API_TOKEN')\n@app.post('/jobs')\ndef create(job):\n    return run(job)\n"
    ),
    "app/core/engine.py": (
        "import sqlite3, requests\ndef run(job):\n    db = sqlite3.connect('jobs.db')\n"
        "    with open('out/result.json', 'w') as f:\n        f.write('x')\n"
        "    cfg = open('config.yaml')\n    requests.post('http://x')\n"
    ),
    "robot/package.xml": "<package><name>robot</name><depend>rclpy</depend></package>",
    "robot/launch/bringup.launch.py": "Node(package='robot', executable='detector')\n",
    "robot/robot/node.py": (
        "from sensor_msgs.msg import Image\nclass N:\n    def __init__(self):\n"
        "        self.create_subscription(Image, '/camera/image', self.cb, 10)\n"
        "        self.pub = self.create_publisher(String, 'detections', 10)\n"
        "        self.srv = self.create_service(Trigger, 'reset', self.on_reset)\n"
        "if __name__ == '__main__':\n    main()\n"
    ),
    "robot/src/arm.cpp": (
        "int main(int argc, char** argv) {\n"
        "  auto p = node->create_publisher<trajectory_msgs::msg::JointTrajectory>(\"/arm/cmd\", 10);\n}\n"
    ),
    "cli.py": "import argparse\np = argparse.ArgumentParser()\np.add_argument('--input')\n",
    "web/app.ts": "import { x } from '../app/thing'\nconst r = await fetch(process.env.BACKEND_URL)\napp.get('/health', h)\n",
    "node_modules/junk/index.js": "app.get('/should-not-appear', h)\n",
    "package.json": json.dumps({"name": "web", "scripts": {"start": "node x"}, "dependencies": {"react": "1"}}),
    "docker-compose.yml": "services:\n  api:\n    image: x\n  worker:\n    image: y\n",
}


@pytest.fixture(scope="module")
def report(tmp_path_factory):
    root = tmp_path_factory.mktemp("repo")
    for rel, text in FILES.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    return scan_repo.scan(root)


def details(report, cat):
    return [s["detail"] for s in report["signals"].get(cat, [])]


def test_http_routes_found_once_each(report):
    # Given routes in Python decorators and JS calls, then each is reported once, with its line
    routes = details(report, "http")
    assert sorted(routes) == ["/health", "/jobs"]
    assert any(s["at"] == "app/api/routes.py:6" for s in report["signals"]["http"])


def test_ros2_topics_services_and_types(report):
    ros = {s["kind"]: s["detail"] for s in report["signals"]["ros2"]}
    assert ros["subscription"] == "/camera/image  [Image]"
    assert ros["service server"] == "reset"
    pubs = [s["detail"] for s in report["signals"]["ros2"] if s["kind"] == "publisher"]
    assert "detections  [String]" in pubs
    assert "/arm/cmd  [trajectory_msgs::msg::JointTrajectory]" in pubs


def test_file_reads_and_writes_are_told_apart(report):
    f = {(s["kind"], s["detail"]) for s in report["signals"]["file"]}
    assert ("write", "out/result.json") in f and ("read", "config.yaml") in f


def test_cli_env_db_and_network_signals(report):
    assert "--input" in details(report, "cli")
    assert {"API_TOKEN", "BACKEND_URL"} <= set(details(report, "env"))
    assert any("sqlite3.connect" in x for x in details(report, "database"))
    assert len(details(report, "network")) >= 2


def test_entry_points_in_python_and_cpp(report):
    found = {(e["file"], e["lang"]) for e in report["entry_points"]}
    assert ("robot/robot/node.py", "Python") in found and ("robot/src/arm.cpp", "C/C++") in found


def test_manifests_are_summarised(report):
    kinds = {m["kind"]: m for m in report["manifests"]}
    assert kinds["ros2 package"]["name"] == "robot"
    assert kinds["ros2 launch"]["executables"] == ["detector"]
    assert kinds["npm"]["scripts"] == ["start"]
    assert kinds["compose"]["services"] == ["api", "worker"]


def test_internal_dependencies_between_top_level_parts(report):
    deps = {(x["from"], x["to"]) for x in report["dependencies"]}
    assert ("app/api", "app/core") in deps
    assert ("web", "app") in deps


def test_vendor_directories_are_ignored(report):
    assert "/should-not-appear" not in details(report, "http")


def test_cli_markdown_and_json(tmp_path):
    (tmp_path / "m.py").write_text("if __name__ == '__main__':\n    pass\n", encoding="utf-8")
    md = subprocess.run([sys.executable, str(SCAN), str(tmp_path)], capture_output=True, text=True)
    assert md.returncode == 0 and "## Entry points" in md.stdout and "`m.py:1`" in md.stdout
    js = subprocess.run([sys.executable, str(SCAN), str(tmp_path), "--json"], capture_output=True, text=True)
    assert json.loads(js.stdout)["entry_points"][0]["file"] == "m.py"


def test_cli_rejects_missing_directory(tmp_path):
    r = subprocess.run([sys.executable, str(SCAN), str(tmp_path / "nope")], capture_output=True, text=True)
    assert r.returncode != 0


def test_single_package_repo_is_split_into_subpackages(tmp_path):
    # Given a repo where all code lives under one package folder with sub-packages
    files = {
        "shop/__init__.py": "", "shop/api/__init__.py": "", "shop/core/__init__.py": "", "shop/worker/__init__.py": "",
        "shop/api/routes.py": "from shop.core.db import save\n",
        "shop/worker/main.py": "from shop.core import db\n",
        "shop/core/db.py": "def save(): pass\n",
    }
    for rel, text in files.items():
        p = tmp_path / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    # When scanned
    deps = {(d["from"], d["to"]) for d in scan_repo.scan(tmp_path)["dependencies"]}
    # Then the sub-packages become the parts, and their imports show
    assert deps == {("shop/api", "shop/core"), ("shop/worker", "shop/core")}


def test_outline_lists_signatures_without_bodies(tmp_path):
    (tmp_path / "svc.py").write_text('class Api(Base):\n    """Public API."""\n    def get(self, key, *rest):\n        return 1\n    def _hidden(self):\n        pass\n\ndef main():\n    """Entry point."""\n', encoding="utf-8")
    (tmp_path / "app.ts").write_text("export async function load(url: string) {}\nexport class Store {}\nconst add = (a, b) => a + b\n", encoding="utf-8")
    (tmp_path / "m.go").write_text("func (s *Server) Handle(w http.ResponseWriter) {\n}\ntype Server struct {\n", encoding="utf-8")
    items = {f["file"]: [x["sig"] for x in f["symbols"]] for f in scan_repo.outline(tmp_path)}
    assert items["svc.py"] == ["class Api(Base)", "def get(key, *rest)", "def main()"]
    assert items["app.ts"][0].startswith("load(") and "Store" in items["app.ts"][1]
    assert any("Handle" in x for x in items["m.go"]) and "Server struct" in items["m.go"]


def test_read_first_ranks_files_with_evidence(report):
    ranked = [x["file"] for x in report["read_first"]]
    assert ranked[0] in ("robot/robot/node.py", "app/core/engine.py")
    assert "app/api/routes.py" in ranked


PEEK = ROOT / "skill" / "unfold" / "scripts" / "peek.py"


def test_peek_symbol_line_and_budget(tmp_path):
    (tmp_path / "w.py").write_text("import x\n\ndef handle(job):\n    a = 1\n    return a\n\n\ndef other():\n    pass\n", encoding="utf-8")
    r = subprocess.run([sys.executable, str(PEEK), str(tmp_path), "w.py:handle"], capture_output=True, text=True)
    assert "def handle(job):" in r.stdout and "return a" in r.stdout and "def other" not in r.stdout
    r = subprocess.run([sys.executable, str(PEEK), str(tmp_path), "w.py:1-2", "w.py:2-3"], capture_output=True, text=True)
    assert r.stdout.count("== w.py") == 1 and "    3  def handle" in r.stdout
    r = subprocess.run([sys.executable, str(PEEK), str(tmp_path), "w.py", "--max", "2"], capture_output=True, text=True)
    assert "budget reached" in r.stdout
    r = subprocess.run([sys.executable, str(PEEK), str(tmp_path), "w.py:missing"], capture_output=True, text=True)
    assert r.returncode == 1 and "not found" in r.stderr


# ---------- token budget, sections, cache, re-scan ----------

EVAL_REPO = ROOT / "skill" / "unfold" / "evals" / "diagram-a-codebase" / "files" / "orderly"


def scan_cli(*args, cache=None):
    env = dict(os.environ, UNFOLD_CACHE_DIR=str(cache)) if cache else None
    extra = [] if cache else ["--no-cache"]
    return subprocess.run([sys.executable, str(SCAN), *map(str, args), *extra], capture_output=True, text=True, env=env)


@pytest.mark.parametrize("budget", [150, 250, 400])
def test_scan_of_the_eval_repo_respects_the_budget(budget):
    # Given the eval fixture repo, when scanned with a token budget
    r = scan_cli(EVAL_REPO, "--budget", budget)
    # Then the output stays within it (~4 chars per token), and says what it cost
    assert r.returncode == 0
    assert len(r.stdout) / 4 <= budget
    assert re.search(r"≈\d+ tokens \(budget %d\)" % budget, r.stdout)
    # And the highest-priority facts are always kept
    assert "Python: 8 files" in r.stdout and "## Entry points" in r.stdout


def test_budget_truncates_long_tails_with_a_hint(tmp_path):
    # Given 60 distinct env vars, when scanned with a small budget
    (tmp_path / "cfg.py").write_text("".join(f"os.environ.get('VAR_{i}')\n" for i in range(60)), encoding="utf-8")
    r = scan_cli(tmp_path, "--budget", 300)
    # Then the tail is cut with a one-line hint naming the section that shows it
    assert re.search(r"… \d+ more; rerun with --section io\.env", r.stdout)
    # And that section alone, with a larger budget, shows all of them
    full = scan_cli(tmp_path, "--section", "io.env", "--budget", 5000)
    assert full.stdout.count("- variable:") == 60 and "## Read these first" not in full.stdout


def test_default_budget_caps_a_big_repo(tmp_path):
    # Given a repo with thousands of signals, when scanned with no options
    for k in range(40):
        (tmp_path / f"m{k}.py").write_text("".join(f"os.environ.get('V{k}_{i}')\nopen('f{k}_{i}.txt')\n" for i in range(50)), encoding="utf-8")
    r = scan_cli(tmp_path)
    # Then the output stays within the default budget, in Markdown and in JSON
    assert len(r.stdout) / 4 <= scan_repo.DEFAULT_BUDGET
    js = scan_cli(tmp_path, "--json")
    data = json.loads(js.stdout)
    assert len(js.stdout) / 4 <= scan_repo.DEFAULT_BUDGET * 1.05 and data["truncated"]["io.env"] > 0


def test_unknown_section_is_rejected(tmp_path):
    r = scan_cli(tmp_path, "--section", "nope")
    assert r.returncode != 0 and "unknown section" in r.stderr


def test_json_section_returns_only_that_part(tmp_path):
    (tmp_path / "a.py").write_text("import os\nos.environ['TOKEN']\nif __name__ == '__main__':\n    pass\n", encoding="utf-8")
    data = json.loads(scan_cli(tmp_path, "--json", "--section", "entry").stdout)
    assert data["entry_points"][0]["file"] == "a.py" and "signals" not in data and data["tokens"] > 0


def test_repeated_signals_are_reported_once_with_a_count(tmp_path):
    # Given the same env var read in 5 files
    for k in range(5):
        (tmp_path / f"m{k}.py").write_text("import os\nos.getenv('DATABASE_URL')\n", encoding="utf-8")
    env = scan_repo.scan(tmp_path)["signals"]["env"]
    # Then it is one entry, with the count and the first locations
    assert len(env) == 1 and env[0]["count"] == 5 and env[0]["at"] == "m0.py:2" and len(env[0]["also"]) == 3
    assert "(5 places)" in scan_cli(tmp_path).stdout


def test_cache_reuses_unchanged_files(tmp_path):
    repo, cache = tmp_path / "repo", tmp_path / "cache"
    repo.mkdir()
    (repo / "a.py").write_text("import os\nos.getenv('AA')\n", encoding="utf-8")
    (repo / "b.py").write_text("import os\nos.getenv('BB')\n", encoding="utf-8")
    # Given a first scan that fills the cache outside the repo
    first = scan_repo.scan(repo, cache_dir=cache)
    assert first["cache"] == {"reused": 0, "read": 2} and not list(repo.glob("**/*.json"))
    # When one file changes and the repo is scanned again
    (repo / "b.py").write_text("import os\nos.getenv('B2')\n", encoding="utf-8")
    os.utime(repo / "b.py", ns=(1, 1))
    again = scan_repo.scan(repo, cache_dir=cache)
    # Then only that file is read, and the result reflects the change
    assert again["cache"] == {"reused": 1, "read": 1}
    assert {s["detail"] for s in again["signals"]["env"]} == {"AA", "B2"}


def test_cli_cache_lives_in_the_cache_dir_and_no_cache_disables_it(tmp_path):
    repo, cache = tmp_path / "repo", tmp_path / "cache"
    repo.mkdir()
    (repo / "a.py").write_text("x = 1\n", encoding="utf-8")
    scan_cli(repo, cache=cache)
    assert list(cache.glob("*/files.json"))
    assert "cache reused 1 of 1 files" in scan_cli(repo, cache=cache).stdout
    assert "cache reused" not in scan_cli(repo).stdout


def test_gitignored_and_vendored_paths_are_skipped_without_git(tmp_path):
    # Given a .gitignore and vendored/build folders in a plain folder
    (tmp_path / ".gitignore").write_text("secret_out/\n*.tmp.py\n", encoding="utf-8")
    for k, path in enumerate(("secret_out/x.py", "skip.tmp.py", "vendor/lib.py", "pkg.egg-info/x.py", "real.py")):
        p = tmp_path / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(f"import os\nos.getenv('V{k}')\n", encoding="utf-8")
    env = {s["detail"] for s in scan_repo.scan(tmp_path)["signals"]["env"]}
    # Then only the real file is scanned
    assert env == {"V4"}


git_required = pytest.mark.skipif(not shutil.which("git"), reason="needs git")


def _git(repo, *args):
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t", *args], check=True, capture_output=True)


@git_required
def test_changed_since_reports_only_changed_files(tmp_path):
    # Given a committed repo
    (tmp_path / "old.py").write_text("import os\nos.getenv('OLD')\n", encoding="utf-8")
    (tmp_path / "gone.py").write_text("x = 1\n", encoding="utf-8")
    (tmp_path / ".gitignore").write_text("ignored/\n", encoding="utf-8")
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "add", ".")
    _git(tmp_path, "commit", "-qm", "init")
    # When a file is added, one deleted and an ignored one created
    (tmp_path / "new.py").write_text("import os\nos.getenv('NEW')\n", encoding="utf-8")
    (tmp_path / "gone.py").unlink()
    (tmp_path / "ignored").mkdir()
    (tmp_path / "ignored" / "x.py").write_text("import os\nos.getenv('IGNORED')\n", encoding="utf-8")
    r = scan_repo.scan(tmp_path, changed_since="HEAD")
    # Then only the new file's signals are reported, and the deletion is listed
    assert {s["detail"] for s in r["signals"]["env"]} == {"NEW"}
    assert r["changed_since"] == {"rev": "HEAD", "changed": ["new.py"], "deleted": ["gone.py"]}
    md = scan_cli(tmp_path, "--changed-since", "HEAD").stdout
    assert "Changed since `HEAD`" in md and "deleted `gone.py`" in md
    # And a full scan honours .gitignore through git
    assert "IGNORED" not in {s["detail"] for s in scan_repo.scan(tmp_path)["signals"]["env"]}


def test_changed_since_outside_git_fails_clearly(tmp_path):
    r = scan_cli(tmp_path, "--changed-since", "HEAD")
    assert r.returncode != 0 and "cannot diff" in r.stderr


def test_outline_respects_the_budget_and_names_prefixes(tmp_path):
    # Given many files with symbols in two parts
    for part in ("api", "core"):
        for k in range(30):
            p = tmp_path / part / f"m{k}.py"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("".join(f"def fn_{i}(a, b):\n    '''Does thing {i}.'''\n\n" for i in range(10)), encoding="utf-8")
    r = scan_cli(tmp_path, "--outline", "--budget", 500)
    # Then the outline stops within budget and says how to narrow it
    assert len(r.stdout) / 4 <= 500
    assert "rerun with --outline PREFIX" in r.stdout and "`core`" in r.stdout
    assert re.search(r"≈\d+ tokens \(budget 500\)", r.stdout)


def test_peek_reports_tokens_and_honours_a_token_budget(tmp_path):
    (tmp_path / "w.py").write_text("".join(f"x_{i} = {i}  # some padding text\n" for i in range(200)), encoding="utf-8")
    r = subprocess.run([sys.executable, str(PEEK), str(tmp_path), "w.py", "--budget", "100"], capture_output=True, text=True)
    assert "100-token budget reached" in r.stdout and len(r.stdout) / 4 <= 100
    assert re.search(r"\[≈\d+ tokens, \d+ of 400 lines, budget 100 tokens\]", r.stdout)
