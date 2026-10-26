"""Phase 3 "Understands" in scripts/unfold.py: confidence, meta.repo and permalinks, drift, diff and merge.
Each test reads Given / When / Then."""
import copy
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "skill" / "unfold" / "scripts" / "unfold.py"
sys.path.insert(0, str(CLI.parent))
import unfold  # noqa: E402

git_required = pytest.mark.skipif(not shutil.which("git"), reason="needs git")


def run(*args):
    return subprocess.run([sys.executable, str(CLI), *map(str, args)], capture_output=True, text=True)


def _git(repo, *args):
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t", *args], check=True, capture_output=True)


@pytest.fixture
def d():
    return {
        "meta": {"title": "Shop"},
        "root": {"type": "architecture", "nodes": [
            {"id": "in", "label": "POST /orders", "shape": "parallelogram", "role": "input", "source": ["api/routes.py:create"]},
            {"id": "svc", "label": "Order service", "source": ["orders/service.py"], "children": {
                "type": "process", "nodes": [
                    {"id": "s", "label": "Order in", "shape": "pill", "role": "input"},
                    {"id": "r", "label": "Reserve stock", "shape": "rect", "source": ["orders/service.py:Service.reserve"]},
                    {"id": "e", "label": "Done", "shape": "pill", "role": "output"},
                ],
                "edges": [{"from": "s", "to": "r"}, {"from": "r", "to": "e"}]}},
            {"id": "out", "label": "Shipment", "shape": "parallelogram", "role": "output", "source": ["orders/service.py:3-4"]},
        ], "edges": [{"from": "in", "to": "svc", "label": "Order"}, {"from": "svc", "to": "out"}]},
    }


@pytest.fixture
def repo(tmp_path):
    files = {
        "api/routes.py": "def create(req):\n    return 1\n",
        "orders/service.py": "class Service:\n    def reserve(self, o):\n        pass\n\n\nTIMEOUT = 5\n",
    }
    for rel, text in files.items():
        p = tmp_path / "repo" / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    return tmp_path / "repo"


# ---------- confidence ----------

def test_confidence_values_validate(d):
    # Given every node marked with a valid confidence, then nothing is reported
    for _, n in unfold.iter_nodes(d["root"]):
        n["confidence"] = "read"
    rep = unfold.validate(d)
    assert rep.errors == [] and rep.warnings == []
    # When one is invalid, then it is an error
    d["root"]["nodes"][0]["confidence"] = "guessed"
    assert any("confidence must be read, peeked or inferred" in e for e in unfold.validate(d).errors)


def test_partial_confidence_warns_once(d):
    # Given only one node marked, then a single warning counts the rest (pills and markers included, text excluded)
    d["root"]["nodes"][0]["confidence"] = "inferred"
    w = [x for x in unfold.validate(d).warnings if "confidence" in x]
    assert w == ["5 node(s) have no 'confidence'; mark every node read, peeked or inferred"]


def test_no_confidence_at_all_is_still_clean(d):
    assert unfold.validate(d).warnings == []


# ---------- meta.repo and permalinks ----------

def test_meta_repo_validates(d):
    d["meta"]["repo"] = {"url": "https://github.com/o/r", "commit": "a" * 40, "root": "services/api"}
    rep = unfold.validate(d)
    assert rep.errors == [] and rep.warnings == []


@pytest.mark.parametrize("repo, needle", [
    ("x", "must be an object"),
    ({"url": "github.com/o/r"}, "http(s) URL"),
    ({"url": "https://user:tok@github.com/o/r", "commit": "abcdef1"}, "credentials"),
    ({"url": "https://github.com/o/r", "commit": "HEAD"}, "commit hash"),
    ({"commit": "abcdef1", "root": "../up"}, "relative folder"),
])
def test_invalid_meta_repo(d, repo, needle):
    d["meta"]["repo"] = repo
    assert any(needle in e for e in unfold.validate(d).errors)


def test_meta_repo_without_commit_warns(d):
    d["meta"]["repo"] = {"url": "https://github.com/o/r", "branch": "main"}
    w = unfold.validate(d).warnings
    assert any("no commit" in x for x in w) and any("meta.repo.branch" in x for x in w)


@pytest.mark.parametrize("remote, url", [
    ("git@github.com:o/r.git", "https://github.com/o/r"),
    ("ssh://git@gitlab.example.com:2222/g/sub/r.git", "https://gitlab.example.com/g/sub/r"),
    ("https://user:token@github.com/o/r.git", "https://github.com/o/r"),
    ("https://github.com/o/r", "https://github.com/o/r"),
    ("/local/path", None),
])
def test_remote_urls_become_browsable_https(remote, url):
    assert unfold.https_url(remote) == url


@pytest.mark.parametrize("repo, src, link", [
    ({"url": "https://github.com/o/r", "commit": "abc1234", "root": "svc"}, "api/x.py:10-20",
     "https://github.com/o/r/blob/abc1234/svc/api/x.py#L10-L20"),
    ({"url": "https://github.com/o/r", "commit": "abc1234"}, "api/x.py:7", "https://github.com/o/r/blob/abc1234/api/x.py#L7"),
    ({"url": "https://github.com/o/r", "commit": "abc1234"}, "api/x.py:Api.get", "https://github.com/o/r/blob/abc1234/api/x.py"),
    ({"url": "https://gitlab.com/g/r", "commit": "abc1234"}, "x.py:3-9", "https://gitlab.com/g/r/-/blob/abc1234/x.py#L3-9"),
    ({"url": "https://github.com/o/r"}, "x.py", None),
])
def test_permalinks(repo, src, link):
    assert unfold.permalink(repo, src) == link


@git_required
def test_build_with_repo_pins_the_commit(tmp_path, d):
    # Given a git repo with an ssh origin, and a diagram without meta.repo
    work = tmp_path / "mono"
    (work / "svc").mkdir(parents=True)
    (work / "svc" / "a.py").write_text("x = 1\n", encoding="utf-8")
    _git(work, "init", "-q")
    _git(work, "remote", "add", "origin", "git@github.com:o/mono.git")
    _git(work, "add", ".")
    _git(work, "commit", "-qm", "init")
    sha = subprocess.run(["git", "-C", str(work), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    src = tmp_path / "d.json"
    src.write_text(json.dumps(d), encoding="utf-8")
    # When built with --repo pointing at a subfolder
    r = run("build", src, tmp_path / "p.html", "--repo", work / "svc")
    assert r.returncode == 0, r.stderr
    # Then the page carries url, commit and root, and the JSON on disk is untouched
    meta = unfold.extract((tmp_path / "p.html").read_text(encoding="utf-8"))["meta"]
    assert meta["repo"] == {"url": "https://github.com/o/mono", "commit": sha, "root": "svc"}
    assert "repo" not in json.loads(src.read_text(encoding="utf-8"))["meta"]
    # And fields already present are kept
    d["meta"]["repo"] = {"url": "https://example.org/mirror/mono"}
    src.write_text(json.dumps(d), encoding="utf-8")
    run("build", src, tmp_path / "p.html", "--repo", work)
    meta = unfold.extract((tmp_path / "p.html").read_text(encoding="utf-8"))["meta"]
    assert meta["repo"] == {"url": "https://example.org/mirror/mono", "commit": sha}


def test_build_with_repo_outside_git_warns(tmp_path, d):
    src = tmp_path / "d.json"
    src.write_text(json.dumps(d), encoding="utf-8")
    r = run("build", src, tmp_path / "p.html", "--repo", tmp_path)
    assert r.returncode == 0 and "not a git work tree" in r.stdout


# ---------- drift ----------

def test_no_drift_when_sources_match(d, repo):
    res = unfold.drift(d, repo)
    assert res["drifted"] == [] and res["checked"] == 4 and res["nodes"] == 4


def test_drift_finds_missing_moved_and_out_of_range(d, repo):
    # Given the code changed under the map: a file deleted, a method moved, a file shortened
    (repo / "api" / "routes.py").unlink()
    (repo / "orders" / "service.py").write_text("x = 1\n", encoding="utf-8")
    (repo / "orders" / "stock.py").write_text("class Service:\n    def reserve(self, o):\n        pass\n", encoding="utf-8")
    d["root"]["nodes"].append({"id": "gone", "label": "Gone", "source": ["orders/service.py:vanished"]})
    # When drift runs
    res = {x["node"]: x for x in unfold.drift(d, repo)["drifted"]}
    # Then each problem is named
    assert res["in"]["problem"] == "missing-file"
    assert res["svc/r"]["problem"] == "moved" and res["svc/r"]["candidates"] == ["orders/stock.py"]
    assert res["out"]["problem"] == "line-out-of-range"
    assert res["gone"]["problem"] == "missing-symbol"
    assert "svc" not in res


def test_drift_finds_a_file_that_moved_folder(d, repo):
    (repo / "src").mkdir()
    shutil.move(str(repo / "api"), str(repo / "src" / "api"))
    res = {x["node"]: x for x in unfold.drift(d, repo)["drifted"]}
    assert res["in"]["problem"] == "moved" and res["in"]["candidates"] == ["src/api/routes.py"]


def test_drift_knows_non_python_definitions(tmp_path):
    files = {"a.ts": "export async function load(url) {}\n", "B.java": "public class B {\n  public Order get(long id) { return x; }\n}\n",
             "c.go": "func (s *Server) Handle(w http.ResponseWriter) {\n}\n", "D.cs": "public IActionResult Create(Order o) => Ok();\n"}
    for k, v in files.items():
        (tmp_path / k).write_text(v, encoding="utf-8")
    data = {"meta": {"title": "t"}, "root": {"nodes": [
        {"id": "a", "label": "a", "source": ["a.ts:load", "B.java:B.get", "c.go:Server.Handle", "D.cs:Create", "c.go:main"]}]}}
    res = unfold.drift(data, tmp_path)["drifted"]
    assert [x["source"] for x in res] == ["c.go:main"]


def test_cli_drift_exit_codes_and_json(tmp_path, d, repo):
    src = tmp_path / "d.json"
    src.write_text(json.dumps(d), encoding="utf-8")
    ok = run("drift", src, "--repo", repo)
    assert ok.returncode == 0 and ok.stdout.startswith("ok: 4 sources")
    (repo / "api" / "routes.py").unlink()
    bad = run("drift", src, "--repo", repo)
    assert bad.returncode == 1 and "in  api/routes.py:create  missing-file" in bad.stdout
    js = json.loads(run("drift", src, "--repo", repo, "--json").stdout)
    assert js["drifted"][0]["problem"] == "missing-file"


def test_drift_action_runs_the_cli():
    action = (ROOT / ".github" / "actions" / "unfold-drift" / "action.yml").read_text(encoding="utf-8")
    import yaml
    spec = yaml.safe_load(action)
    assert spec["runs"]["using"] == "composite" and {"diagram", "repo"} <= set(spec["inputs"])
    assert "scripts/unfold.py" in action and 'drift "$DIAGRAM" --repo "$REPO"' in action


def test_schema_docs_match_the_code(d):
    # Given references/schema.md, then its source grammar is the one drift uses
    md = (ROOT / "skill" / "unfold" / "references" / "schema.md").read_text(encoding="utf-8")
    assert re.search(r"Grammar: `([^`]+)`", md).group(1) == unfold.SOURCE_RE.pattern
    # And its meta.repo example validates
    example = json.loads(re.search(r"## Repository and permalinks.*?```json\n(.*?)```", md, re.S).group(1))
    d["meta"] = example["meta"]
    rep = unfold.validate(d)
    assert rep.errors == [] and rep.warnings == []


# ---------- diff ----------

def _changed(d):
    new = copy.deepcopy(d)
    nodes = new["root"]["nodes"]
    nodes[1]["label"] = "Orders"
    nodes.pop(2)  # out removed
    nodes.append({"id": "cache", "label": "Cache", "shape": "cylinder"})
    new["root"]["edges"] = [{"from": "in", "to": "svc", "label": "OrderRequest"}, {"from": "svc", "to": "cache"}]
    return new


def test_diff_lists_added_removed_and_changed(d):
    res = unfold.diff(d, _changed(d))
    assert [x["id"] for x in res["nodes"]["added"]] == ["cache"]
    assert [x["id"] for x in res["nodes"]["removed"]] == ["out"]
    assert res["nodes"]["changed"] == [{"level": "", "id": "svc", "label": "Orders", "fields": ["label"]}]
    assert [(e["from"], e["to"]) for e in res["edges"]["added"]] == [("svc", "cache")]
    assert [(e["from"], e["to"]) for e in res["edges"]["removed"]] == [("svc", "out")]
    assert res["edges"]["changed"][0]["fields"] == ["label"]


def test_diff_compares_nested_levels_and_children_presence(d):
    new = copy.deepcopy(d)
    new["root"]["nodes"][1]["children"]["nodes"][1]["source"] = ["orders/stock.py:reserve"]
    new["root"]["nodes"][0]["children"] = {"nodes": [{"id": "x", "label": "X"}]}
    res = unfold.diff(d, new)["nodes"]["changed"]
    assert {(x["level"], x["id"], tuple(x["fields"])) for x in res} == {("svc", "r", ("source",)), ("", "in", ("children",))}


def test_diff_page_marks_everything_and_puts_removed_back(tmp_path, d):
    old, new = tmp_path / "old.json", tmp_path / "new.json"
    old.write_text(json.dumps(d), encoding="utf-8")
    new.write_text(json.dumps(_changed(d)), encoding="utf-8")
    r = run("diff", old, new, "--page", tmp_path / "diff.html")
    assert r.returncode == 0, r.stderr
    assert "+ node cache" in r.stdout and "- node out" in r.stdout and "~ node svc" in r.stdout
    data = unfold.extract((tmp_path / "diff.html").read_text(encoding="utf-8"))
    marks = {n["id"]: n.get("diff") for n in data["root"]["nodes"]}
    assert marks == {"in": None, "svc": "changed", "cache": "added", "out": "removed"}
    edges = {(e["from"], e["to"]): e.get("diff") for e in data["root"]["edges"]}
    assert edges == {("in", "svc"): "changed", ("svc", "cache"): "added", ("svc", "out"): "removed"}
    assert unfold.validate(data).ok
    js = json.loads(run("diff", old, new, "--json").stdout)
    assert len(js["nodes"]["added"]) == 1


def test_invalid_diff_mark_is_an_error(d):
    d["root"]["nodes"][0]["diff"] = "moved"
    d["root"]["edges"][0]["diff"] = "new"
    assert len([e for e in unfold.validate(d).errors if "diff must be" in e]) == 2


# ---------- merge ----------

def test_merge_keeps_human_edits_and_takes_new_findings(d):
    base = d
    ours = copy.deepcopy(d)
    ours["root"]["nodes"][1]["label"] = "Orders (core)"          # human renamed
    for n in ours["root"]["nodes"]:                                 # human arranged the level
        n["x"], n["y"] = 100 * len(n["id"]), 50
    ours["root"]["nodes"] = [n for n in ours["root"]["nodes"] if n["id"] != "out"]  # human deleted
    ours["root"]["edges"] = [e for e in ours["root"]["edges"] if e["to"] != "out"]
    theirs = copy.deepcopy(d)
    theirs["root"]["nodes"][1]["note"] = "Validates and reserves."   # scan learned something
    theirs["root"]["nodes"][0]["source"] = ["api/v2/routes.py:create"]  # code moved
    theirs["root"]["nodes"][2]["label"] = "Shipment event"         # changed upstream, deleted by human
    theirs["root"]["nodes"].append({"id": "cache", "label": "Cache", "shape": "cylinder", "x": 1, "y": 1})
    theirs["root"]["edges"].append({"from": "svc", "to": "cache"})
    theirs["root"]["edges"].append({"from": "out", "to": "cache"})  # touches a node the human deleted

    data, m = unfold.merge(base, ours, theirs)
    nodes = {n["id"]: n for n in data["root"]["nodes"]}
    assert nodes["svc"]["label"] == "Orders (core)" and nodes["svc"]["note"] == "Validates and reserves."
    assert nodes["in"]["source"] == ["api/v2/routes.py:create"]
    assert "out" not in nodes
    # The new node sits in a column right of the hand-arranged level instead of re-laying it
    assert nodes["cache"]["x"] == max(n["x"] for n in ours["root"]["nodes"]) + 220
    assert ("svc", "cache") in {(e["from"], e["to"]) for e in data["root"]["edges"]}
    assert ("out", "cache") not in {(e["from"], e["to"]) for e in data["root"]["edges"]}
    assert m.conflicts == [] and any("stays deleted" in n for n in m.notes)
    assert unfold.validate(data).ok


def test_merge_reports_conflicts_and_keeps_ours(d):
    ours, theirs = copy.deepcopy(d), copy.deepcopy(d)
    ours["root"]["nodes"][1]["label"] = "Mine"
    theirs["root"]["nodes"][1]["label"] = "Theirs"
    data, m = unfold.merge(d, ours, theirs)
    assert data["root"]["nodes"][1]["label"] == "Mine"
    assert m.conflicts == [{"where": "root > svc", "field": "label", "base": "Order service", "ours": "Mine", "theirs": "Theirs"}]


def test_merge_new_nodes_in_an_auto_laid_level_get_no_position(d):
    theirs = copy.deepcopy(d)
    theirs["root"]["nodes"][1]["children"]["nodes"].append({"id": "chk", "label": "Check", "x": 5, "y": 5})
    data, m = unfold.merge(d, copy.deepcopy(d), theirs)
    chk = data["root"]["nodes"][1]["children"]["nodes"][-1]
    assert chk["id"] == "chk" and "x" not in chk and m.stats["added"] == 1


def test_merge_scan_removal_drops_untouched_but_keeps_edited(d):
    ours, theirs = copy.deepcopy(d), copy.deepcopy(d)
    theirs["root"]["nodes"] = [n for n in theirs["root"]["nodes"] if n["id"] not in ("in", "out")]
    theirs["root"]["edges"] = [e for e in theirs["root"]["edges"] if "in" not in (e["from"], e["to"]) and "out" not in (e["from"], e["to"])]
    ours["root"]["nodes"][0]["note"] = "Hand-written note."
    data, m = unfold.merge(d, ours, theirs)
    ids = [n["id"] for n in data["root"]["nodes"]]
    assert "in" in ids and "out" not in ids
    assert m.conflicts[0]["where"] == "root > in" and m.conflicts[0]["theirs"] == "removed by the new scan"


def test_merge_meta_follows_the_new_commit(d):
    base, ours, theirs = copy.deepcopy(d), copy.deepcopy(d), copy.deepcopy(d)
    base["meta"]["repo"] = ours["meta"]["repo"] = {"url": "https://github.com/o/r", "commit": "a" * 40}
    theirs["meta"]["repo"] = {"url": "https://github.com/o/r", "commit": "b" * 40}
    ours["meta"]["title"] = "Shop (edited)"
    data, _ = unfold.merge(base, ours, theirs)
    assert data["meta"] == {"title": "Shop (edited)", "repo": {"url": "https://github.com/o/r", "commit": "b" * 40}}


def test_cli_merge(tmp_path, d):
    ours, theirs = copy.deepcopy(d), copy.deepcopy(d)
    ours["root"]["nodes"][1]["label"] = "Mine"
    theirs["root"]["nodes"][1]["label"] = "Theirs"
    for name, data in (("base", d), ("ours", ours), ("theirs", theirs)):
        (tmp_path / f"{name}.json").write_text(json.dumps(data), encoding="utf-8")
    r = run("merge", "--base", tmp_path / "base.json", "--ours", tmp_path / "ours.json", "--theirs", tmp_path / "theirs.json", "-o", tmp_path / "out.json")
    assert r.returncode == 0, r.stderr
    assert "1 conflicts" in r.stdout and "conflict (kept yours): root > svc: label" in r.stdout
    assert json.loads((tmp_path / "out.json").read_text(encoding="utf-8"))["root"]["nodes"][1]["label"] == "Mine"
