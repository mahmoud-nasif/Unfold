"""Unit tests for skill/unfold/scripts/unfold.py (schema v2). Each test reads Given / When / Then."""
import copy
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skill" / "unfold"
CLI = SKILL / "scripts" / "unfold.py"
TEMPLATE = SKILL / "assets" / "template.html"
EXAMPLES = sorted((ROOT / "examples").glob("*/diagram.json"))

sys.path.insert(0, str(SKILL / "scripts"))
import unfold as story  # noqa: E402


@pytest.fixture
def d():
    return {
        "meta": {"title": "T"},
        "root": {
            "type": "architecture",
            "nodes": [
                {"id": "in", "label": "Request", "shape": "parallelogram", "role": "input"},
                {"id": "svc", "label": "Service", "source": ["svc.py"], "children": {
                    "type": "process",
                    "nodes": [
                        {"id": "s", "label": "Start", "shape": "pill", "role": "input"},
                        {"id": "q", "label": "Ok?", "shape": "diamond"},
                        {"id": "e", "label": "End", "shape": "pill", "role": "output"},
                    ],
                    "edges": [{"from": "s", "to": "q"}, {"from": "q", "to": "e", "label": "yes"}],
                }},
                {"id": "out", "label": "Response", "shape": "parallelogram", "role": "output"},
            ],
            "edges": [{"from": "in", "to": "svc"}, {"from": "svc", "to": "out"}],
        },
    }


def errs(data):
    return story.validate(data).errors


def warns(data):
    return story.validate(data).warnings


def run(*args):
    return subprocess.run([sys.executable, str(CLI), *args], capture_output=True, text=True)


# ---------- valid data ----------

def test_valid_diagram_has_no_errors_or_warnings(d):
    # Given a well-formed two-level diagram, when validated, then nothing is reported
    rep = story.validate(d)
    assert rep.errors == [] and rep.warnings == []


@pytest.mark.parametrize("path", EXAMPLES, ids=lambda p: p.parent.name)
def test_shipped_examples_are_clean(path):
    # Given a shipped example, when validated, then it has no errors and no warnings
    rep = story.validate(json.loads(path.read_text(encoding="utf-8")))
    assert rep.errors == [] and rep.warnings == []


def test_schema_reference_example_is_valid():
    # Given the JSON example printed in references/schema.md
    md = (SKILL / "references" / "schema.md").read_text(encoding="utf-8")
    block = re.search(r"## Example\s+```json\n(.*?)```", md, re.S).group(1)
    # Then it validates with no errors and no warnings, so the docs never drift from the code
    rep = story.validate(json.loads(block))
    assert rep.errors == [] and rep.warnings == []


# ---------- structural errors ----------

def test_missing_title(d):
    del d["meta"]["title"]
    assert any("meta.title" in e for e in errs(d))


def test_duplicate_ids_in_a_level(d):
    d["root"]["nodes"][2]["id"] = "in"
    assert any("duplicate id 'in'" in e for e in errs(d))


def test_ids_are_scoped_per_level(d):
    # Given an inner node reusing a root id, then it is allowed
    d["root"]["nodes"][1]["children"]["nodes"][0]["id"] = "in"
    d["root"]["nodes"][1]["children"]["edges"][0]["from"] = "in"
    assert errs(d) == []


def test_edge_to_other_level_is_an_error(d):
    d["root"]["edges"].append({"from": "in", "to": "q"})
    assert any("'to' = 'q'" in e for e in errs(d))


def test_self_edge_is_an_error(d):
    d["root"]["edges"].append({"from": "svc", "to": "svc"})
    assert any("itself" in e for e in errs(d))


@pytest.mark.parametrize("field,value,needle", [
    ("shape", "star", "unknown shape"),
    ("color", "orange", "colour must be"),
    ("role", "sink", "role must be"),
    ("source", "svc.py", "'source' must be a list"),
    ("text", {"size": "xl"}, "text.size"),
    ("text", {"bold": "yes"}, "text.bold"),
    ("w", 5, "at least 20"),
    ("group", "nope", "group 'nope'"),
])
def test_invalid_node_fields(d, field, value, needle):
    # Given a node with one invalid field, when validated, then that field is named
    d["root"]["nodes"][2][field] = value
    assert any(needle in e for e in errs(d)), errs(d)


def test_hex_colour_is_accepted(d):
    d["root"]["nodes"][2]["color"] = "#2B7A4B"
    assert errs(d) == []


def test_half_a_position_is_an_error(d):
    d["root"]["nodes"][2]["x"] = 10
    assert any("both 'x' and 'y'" in e for e in errs(d))


def test_boolean_is_not_a_number(d):
    d["root"]["nodes"][2].update(x=True, y=0)
    assert any("'x' must be a number" in e for e in errs(d))


@pytest.mark.parametrize("field,value", [("type", "flow"), ("direction", "RL")])
def test_invalid_level_fields(d, field, value):
    d["root"][field] = value
    assert errs(d)


@pytest.mark.parametrize("field,value", [("style", "zigzag"), ("arrow", "left")])
def test_invalid_edge_fields(d, field, value):
    d["root"]["edges"][0][field] = value
    assert any(f"'{field}' must be one of" in e for e in errs(d))


def test_errors_inside_nested_levels_are_found(d):
    # Given an error three levels down
    inner = d["root"]["nodes"][1]["children"]["nodes"][1]
    inner["children"] = {"nodes": [{"id": "a", "label": "A", "shape": "blob"}]}
    # Then the path to it is reported
    assert any("root > svc > q > a" in e for e in errs(d))


# ---------- warnings that guide good diagrams ----------

def test_missing_input_and_output_roles_warn(d):
    # Given a level with edges but no marked input or output
    for n in d["root"]["nodes"]:
        n.pop("role", None)
    w = warns(d)
    # Then both are flagged, because readers look for them first
    assert any("marked as an input" in x for x in w) and any("marked as an output" in x for x in w)


def test_partial_coordinates_warn(d):
    d["root"]["nodes"][0].update(x=0, y=0)
    assert any("auto-laid out" in x for x in warns(d))


def test_process_level_drawn_as_components_warns(d):
    for n in d["root"]["nodes"][1]["children"]["nodes"]:
        n["shape"] = "rounded"
    assert any("process level drawn mostly with component boxes" in x for x in warns(d))


def test_v1_fields_warn_but_pass(d):
    d["story"] = []
    d["root"]["nodes"][2]["kind"] = "core"
    rep = story.validate(d)
    assert rep.ok and any("v1 field" in x for x in rep.warnings)


def test_empty_group_warns(d):
    d["root"]["groups"] = [{"id": "g", "label": "Empty"}]
    assert any("no member nodes" in x for x in warns(d))


# ---------- embed / extract / outline ----------

def test_embed_extract_round_trip(d):
    assert story.extract(story.embed(d, TEMPLATE.read_text(encoding="utf-8"))) == d


def test_embed_neutralises_script_breakout(d):
    evil = copy.deepcopy(d)
    evil["root"]["nodes"][0]["label"] = "</script><script>alert(1)</script>"
    page = story.embed(evil, TEMPLATE.read_text(encoding="utf-8"))
    assert "<" not in story.DATA_RE.search(page).group(2)
    assert story.extract(page) == evil


def test_title_is_escaped(d):
    d["meta"]["title"] = "A & <B>"
    assert "<title>A &amp; &lt;B&gt;</title>" in story.embed(d, TEMPLATE.read_text(encoding="utf-8"))


def test_extract_rejects_unrelated_html():
    with pytest.raises(ValueError, match="no story-data block"):
        story.extract("<html></html>")


def test_outline_shows_nesting_roles_and_sources(d):
    text = story.outline(d)
    assert "[architecture]" in text and "[process]" in text
    assert "+ Service  (1 src)" in text
    assert "- Request  (INPUT, parallelogram)" in text


# ---------- CLI ----------

def test_cli_build_and_extract(tmp_path, d):
    src, out = tmp_path / "d.json", tmp_path / "p.html"
    src.write_text(json.dumps(d), encoding="utf-8")
    r = run("build", str(src), str(out))
    assert r.returncode == 0, r.stderr
    r = run("extract", str(out))
    assert r.returncode == 0 and json.loads(r.stdout) == d


def test_cli_build_refuses_invalid_data(tmp_path, d):
    d["root"]["edges"].append({"from": "in", "to": "zzz"})
    src, out = tmp_path / "d.json", tmp_path / "p.html"
    src.write_text(json.dumps(d), encoding="utf-8")
    r = run("build", str(src), str(out))
    assert r.returncode == 1 and "zzz" in r.stderr and not out.exists()


def test_cli_check_and_outline_accept_a_built_page(tmp_path, d):
    page = tmp_path / "p.html"
    page.write_text(story.embed(d, TEMPLATE.read_text(encoding="utf-8")), encoding="utf-8")
    assert run("check", str(page)).returncode == 0
    assert "Service" in run("outline", str(page)).stdout


def test_cli_reports_malformed_json(tmp_path):
    src = tmp_path / "d.json"
    src.write_text("{nope", encoding="utf-8")
    r = run("check", str(src))
    assert r.returncode != 0 and "not valid JSON" in r.stderr


# ---------- template consistency ----------

def _engine():
    tpl = TEMPLATE.read_text(encoding="utf-8")
    return re.search(r'<script id="ss-engine">(.*)</script>', tpl, re.S).group(1)


def test_validator_and_engine_agree_on_icons():
    block = re.search(r"var ICONS=\{(.*?)\n\};", _engine(), re.S).group(1)
    assert set(re.findall(r"^\s*([a-z]+):\[", block, re.M)) == set(story.ICONS)


def test_validator_and_engine_agree_on_shapes_and_colours():
    eng = _engine()
    shapes = set(re.findall(r"'([a-z0-9]+)'", re.search(r"var SHAPE_ORDER=\[(.*?)\]", eng).group(1)))
    colors = set(re.findall(r"'([a-z]+)'", re.search(r"var COLORS=\[(.*?)\]", eng).group(1)))
    assert shapes == set(story.SHAPES) and colors == set(story.COLORS)


def test_validator_and_engine_agree_on_level_types():
    block = re.search(r"var TYPE_NAMES=\{(.*?)\};", _engine()).group(1)
    assert set(re.findall(r"([a-z0-9]+):'", block)) == set(story.LEVEL_TYPES)


def test_engine_never_contains_a_raw_script_close():
    assert "</script" not in _engine()


def test_template_sample_data_is_clean():
    rep = story.validate(story.extract(TEMPLATE.read_text(encoding="utf-8")))
    assert rep.errors == [] and rep.warnings == []


@pytest.mark.parametrize("path", EXAMPLES, ids=lambda p: p.parent.name)
def test_built_examples_are_up_to_date(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    story.inline_media(data, path.parent)
    page = path.parent / "index.html"
    assert page.exists(), "run: make examples"
    built = story.extract(page.read_text(encoding="utf-8"))
    repo = built["meta"].pop("repo", None)  # pinned at build time by `make examples` (--repo .)
    assert built == data, "run: make examples"
    if repo:
        data["meta"]["repo"] = repo
    assert page.read_text(encoding="utf-8") == story.embed(data, TEMPLATE.read_text(encoding="utf-8")), "run: make examples"


def test_template_matches_engine_sources():
    # Given the engine sources in engine/, when assembled, then they equal the committed template
    sys.path.insert(0, str(ROOT / "engine"))
    import assemble
    assert assemble.assemble() == TEMPLATE.read_text(encoding="utf-8"), "run: make engine examples"


# ---------- v0.3 schema ----------

def test_new_level_types_and_shapes_validate(d):
    d["root"]["nodes"][1]["children"] = {"type": "sequence", "nodes": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}],
        "edges": [{"from": "a", "to": "b", "label": "call"}, {"from": "b", "to": "b", "label": "self"}]}
    d["root"]["nodes"].append({"id": "m", "label": "Models", "children": {"type": "data", "nodes": [
        {"id": "o", "label": "Order", "shape": "table", "fields": ["id: int PK"]}], "edges": []}})
    d["root"]["nodes"].append({"id": "s", "label": "Modes", "children": {"type": "state", "nodes": [
        {"id": "i", "label": "", "shape": "initial"}, {"id": "x", "label": "Idle"}], "edges": [{"from": "i", "to": "x"}]}})
    rep = story.validate(d)
    assert rep.errors == [] and rep.warnings == []


def test_self_edge_only_allowed_in_sequence(d):
    d["root"]["edges"].append({"from": "svc", "to": "svc"})
    assert errs(d)
    d["root"]["edges"].pop()
    d["root"]["type"] = "sequence"
    d["root"]["edges"].append({"from": "svc", "to": "svc"})
    assert not any("itself" in e for e in errs(d))


@pytest.mark.parametrize("media,needle", [({"type": "image"}, "needs a string 'src'"), ({"src": "a.png", "type": "gif"}, "media.type")])
def test_invalid_media(d, media, needle):
    d["root"]["nodes"][2]["media"] = media
    assert any(needle in e for e in errs(d))


def test_meta_summary_and_glossary(d):
    d["meta"]["summary"] = "Does a thing."
    d["meta"]["glossary"] = [{"term": "X", "def": "a thing"}]
    assert story.validate(d).warnings == []
    d["meta"]["glossary"] = [{"term": "X"}]
    assert any("glossary" in e for e in errs(d))


def test_tables_without_fields_warn(d):
    d["root"]["nodes"][1]["children"] = {"type": "data", "nodes": [{"id": "t", "label": "T", "shape": "table"}], "edges": []}
    assert any("tables without fields" in w for w in warns(d))


def test_build_inlines_local_media(tmp_path, d):
    (tmp_path / "img").mkdir()
    (tmp_path / "img" / "a.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"0" * 20)
    d["root"]["nodes"][2]["media"] = {"src": "img/a.png"}
    src, out = tmp_path / "d.json", tmp_path / "p.html"
    src.write_text(json.dumps(d), encoding="utf-8")
    assert run("build", str(src), str(out)).returncode == 0
    m = story.extract(out.read_text(encoding="utf-8"))["root"]["nodes"][2]["media"]
    assert m["src"].startswith("data:image/png;base64,")


def test_build_fails_on_missing_media(tmp_path, d):
    d["root"]["nodes"][2]["media"] = {"src": "nope.png"}
    src, out = tmp_path / "d.json", tmp_path / "p.html"
    src.write_text(json.dumps(d), encoding="utf-8")
    r = run("build", str(src), str(out))
    assert r.returncode == 1 and "media file not found" in r.stderr


# ---------- usage and upgrade (0.5.0) ----------

def _transcript(path, calls):
    lines = []
    for i, (mid, ts, u) in enumerate(calls):
        lines.append(json.dumps({"timestamp": ts, "message": {"id": mid, "model": "m-1", "usage": u}}))
    path.write_text("\n".join(lines), encoding="utf-8")


def test_usage_counts_each_api_message_once_and_prices_it(tmp_path):
    # Given a transcript where one message is logged twice (one line per content block)
    u = {"input_tokens": 10, "output_tokens": 20, "cache_read_input_tokens": 1000, "cache_creation_input_tokens": 100}
    t = tmp_path / "s.jsonl"
    _transcript(t, [("a", "2026-10-27T09:00:00Z", u), ("a", "2026-10-27T09:00:01Z", u), ("b", "2026-10-27T10:00:00Z", u)])
    diagram = tmp_path / "d.json"
    diagram.write_text(json.dumps({"meta": {"title": "T"}, "root": {"nodes": [{"id": "a", "label": "A"}]}}))
    # When stamping from 09:30 on, with rates per million tokens
    r = subprocess.run([sys.executable, str(CLI), "usage", str(diagram), "--transcript", str(t), "--since", "2026-10-27T09:30:00Z", "--rates", "3,15,3.75,0.3"],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    # Then only the second message counts, and cost follows the rates
    g = json.loads(diagram.read_text())["meta"]["generation"]
    assert (g["input_tokens"], g["output_tokens"], g["cache_read_tokens"], g["cache_write_tokens"]) == (10, 20, 1000, 100)
    assert g["cost"] == round((10 * 3 + 20 * 15 + 100 * 3.75 + 1000 * 0.3) / 1e6, 4)
    assert story.validate(json.loads(diagram.read_text())).ok


def test_usage_without_a_cost_source_records_no_cost(tmp_path):
    diagram = tmp_path / "d.json"
    diagram.write_text(json.dumps({"meta": {"title": "T"}, "root": {"nodes": [{"id": "a", "label": "A"}]}}))
    r = subprocess.run([sys.executable, str(CLI), "usage", str(diagram), "--input-tokens", "5", "--output-tokens", "7"], capture_output=True, text=True)
    assert r.returncode == 0 and "cost" not in json.loads(diagram.read_text())["meta"]["generation"]


def test_check_rejects_bad_edge_sides_label_offsets_and_generation(d):
    d["root"]["edges"][0].update({"fromSide": "x", "labelT": 2})
    d["meta"]["generation"] = {"input_tokens": -1}
    errs = " ".join(story.validate(d).errors)
    assert "fromSide" in errs and "labelT" in errs and "input_tokens" in errs


def test_tags_must_be_a_list_of_strings(d):
    d["root"]["nodes"][0]["tags"] = ["planned", 3]
    assert any("tags" in e for e in story.validate(d).errors)


def test_upgrade_rebuilds_stale_pages_and_keeps_their_data(tmp_path):
    # Given a page built with an older engine
    data = json.loads((ROOT / "examples" / "unfold" / "diagram.json").read_text())
    old = TEMPLATE.read_text().replace('<script id="ss-engine">', '<script id="ss-engine">/* old */')
    page = tmp_path / "m.html"
    page.write_text(story.embed(data, old), encoding="utf-8")
    run = lambda *a: subprocess.run([sys.executable, str(CLI), "upgrade", *a], capture_output=True, text=True)
    # When checked, it is reported
    assert run("--check", str(tmp_path)).returncode == 1
    # When upgraded, the engine is current, the data is unchanged, and a backup exists on request
    assert run(str(page), "--backup").returncode == 0
    assert run("--check", str(tmp_path)).returncode == 0
    assert story.extract(page.read_text()) == data
    assert (tmp_path / "m.html.bak").exists()


# ---------- plan mode (0.5.0) ----------

def test_status_counts_planned_parts_and_open_questions(tmp_path):
    d = {"meta": {"title": "T", "intent": "plan"}, "root": {"nodes": [
        {"id": "a", "label": "A", "tags": ["planned"]},
        {"id": "b", "label": "B"},
        {"id": "q", "label": "Which queue?", "tags": ["open question"]},
        {"id": "c", "label": "C", "tag": "planned", "children": {"nodes": [{"id": "x", "label": "X", "tags": ["planned"]}]}}]}}
    f = tmp_path / "d.json"
    f.write_text(json.dumps(d))
    st = story.planning_status(d)
    assert (st["planned"], st["built"]) == (3, 1) and st["questions"][0]["node"] == "q"
    r = subprocess.run([sys.executable, str(CLI), "status", str(f)], capture_output=True, text=True)
    assert r.returncode == 0 and "1 of 4 parts built, 3 still planned, 1 open question" in r.stdout


def test_upgrade_turns_single_tags_into_tag_lists():
    d = {"root": {"nodes": [{"id": "a", "label": "A", "tag": "planned", "children": {"nodes": [{"id": "b", "label": "B", "tag": "legacy"}]}}]}}
    assert story.migrate(d) == 2
    assert d["root"]["nodes"][0]["tags"] == ["planned"] and "tag" not in d["root"]["nodes"][0]
    assert d["root"]["nodes"][0]["children"]["nodes"][0]["tags"] == ["legacy"]
