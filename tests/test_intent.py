"""Intent first (ROADMAP phase 2b): meta.intent / meta.audience validation, docs and eval cases.
Each test reads Given / When / Then."""
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skill" / "unfold"
EVALS = SKILL / "evals"
sys.path.insert(0, str(SKILL / "scripts"))
import unfold as story  # noqa: E402

MAIN = ("learn", "demonstrate", "explain", "review")


def _diagram(**meta):
    return {
        "meta": {"title": "T", **meta},
        "root": {"nodes": [{"id": "a", "label": "A"}]},
    }


@pytest.mark.parametrize("intent", sorted(story.INTENTS))
def test_every_intent_is_accepted(intent):
    # Given a diagram framed with a known intent and an audience, then it validates
    assert story.validate(_diagram(intent=intent, audience="new developers")).errors == []


@pytest.mark.parametrize("bad", ["onboarding", "", 3, None])
def test_unknown_intent_is_an_error(bad):
    # Given an intent outside the enum, then check names the field and the choices
    errs = story.validate(_diagram(intent=bad)).errors
    assert any("meta.intent" in e and "demonstrate" in e for e in errs)


def test_audience_must_be_text():
    assert any("meta.audience" in e for e in story.validate(_diagram(audience=["devs"])).errors)


def test_intent_is_optional():
    assert story.validate(_diagram()).errors == []


def test_schema_and_intents_reference_document_every_intent():
    # Given the enum in unfold.py, then schema.md lists every value and intents.md covers every value
    schema = (SKILL / "references" / "schema.md").read_text(encoding="utf-8")
    intents = (SKILL / "references" / "intents.md").read_text(encoding="utf-8")
    assert "meta.audience" in schema
    for i in story.INTENTS:
        assert f"`{i}`" in schema
        assert f"`{i}`" in intents


def test_intents_reference_has_a_section_per_main_intent_with_follow_ups():
    # Given references/intents.md, then each main intent has its own section with the agreed headings
    text = (SKILL / "references" / "intents.md").read_text(encoding="utf-8")
    sections = {s.split("\n", 1)[0]: s for s in re.split(r"^## ", text, flags=re.M)}
    headings = {"learn": "Learn the codebase", "demonstrate": "Demonstrate my work",
                "explain": "Explain a specific detail", "review": "Review a change"}
    for intent in MAIN:
        sec = sections[headings[intent]]
        for field in ("Scope", "Depth", "Level types", "Tour", "Media", "Citations", "Glossary", "Follow-ups"):
            assert f"**{field}:**" in sec, f"{intent} lacks {field}"


def test_skill_md_puts_intent_first_in_framing():
    # Given step 1 of SKILL.md, then intent comes before scope and the five options are named
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    step1 = text.split("### 1. Frame the request", 1)[1].split("### 2.", 1)[0]
    assert step1.index("ntent") < step1.index("**scope:**")
    for option in ("Learn the codebase", "Demonstrate my work", "Explain a specific detail", "Review a change", "Other"):
        assert option in step1
    assert "at most two follow-ups" in step1


@pytest.mark.parametrize("case", [f"intent-{i}" for i in MAIN] + ["does-not-ask-when-clear"])
def test_intent_eval_cases_follow_the_case_format(case):
    # Given an intent eval case, then it has case.yaml, a prompt with frontmatter, and at least two graders
    d = EVALS / case
    yaml_text = (d / "case.yaml").read_text(encoding="utf-8")
    assert f"name: {case}" in yaml_text and "expected_outcome:" in yaml_text
    assert (d / "prompt.md").read_text(encoding="utf-8").startswith("---\n")
    graders = sorted((d / "graders").glob("*.md"))
    assert len(graders) >= 2
    for g in graders:
        assert g.read_text(encoding="utf-8").startswith("---\ntype: llm\n")
