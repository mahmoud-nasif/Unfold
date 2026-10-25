"""Tests for scripts/scan_repo.py against a small mixed-language fixture repository."""
import json
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
