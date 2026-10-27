# Plan mode: design in conversation, then build

Use this when there is no codebase to read, or when the user wants to think a system through before any code exists. The map is the plan. It starts as a conversation, becomes a diagram of parts that are all `planned`, and turns into a map of real code as each part gets built.

Record `meta.intent: "plan"`. Everything else in SKILL.md (quality bar, schema, `check`, `build`) applies, except that nothing is scanned.

## 1. Talk first

Do not draw yet. Ask in one short batch, at most three questions, skipping what the user already said:

- *What should it do, and for whom?*
- *What is fixed already: language, hardware, existing systems it must work with?*
- *What do you not know yet?* (these become open questions)

If the user is vague, offer two or three concrete shapes the system could take and ask which is closer. Never invent requirements; write down what was said.

## 2. Draw the plan

Write `diagram.json` from the conversation:

- The overview is an `architecture` level of 4 to 10 parts, with `role: "input"` and `"output"` where data enters and leaves.
- Every part gets `"tags": ["planned"]` and `"confidence": "inferred"`. Planned parts are drawn with a dashed outline.
- No `source` for code that does not exist. Say where it will live in the `note`: "Will live in `src/ingest.py`."
- A choice the user has not made is a `text`-free node tagged `open question`, linked to the parts it affects, with the options in its `note`.
- A part that has a decided flow gets a `process` or `sequence` child, drawn the same way. Do not draw levels for parts nobody has thought about.
- `meta.summary` says what the system will do, in the user's words.

Then `check`, `outline`, `build`, and show the user the outline plus the page. Ask what is wrong or missing.

## 3. Iterate

Each round is a small patch to `diagram.json`, then `build`. Never re-print the whole file. When the user decides an open question, put the decision in the part's `note`, remove the `open question` node or tag, and rebuild. Stop iterating when the user says to build.

## 4. Build it

Get an explicit go-ahead first. Then, in the order the data flows (inputs first):

1. Implement one part, with its tests.
2. In `diagram.json`: remove `planned` from its tags, set `source` to the real `file.py:symbol`, set `confidence` to `read`, and rewrite the `note` to say what the code does now.
3. `check`, `build`, `status`.

If the code forces a change to the plan (a part splits, a flow turns out different), change the map in the same step and tell the user in a line. The map must never describe something other than what exists or is still intended.

## 5. Finish

- `unfold.py status diagram.json` should show nothing planned, or only parts the user chose to leave for later.
- Run `drift --repo .`: every `source` resolves.
- Switch `meta.intent` to the one that fits now (`document` for a hand-over, `learn` for onboarding) if the user wants the map kept.
- Run `unfold.py usage` as in SKILL.md, then rebuild.

## Commands

```bash
python scripts/unfold.py status diagram.json      # "5 of 12 parts built, 7 still planned, 2 open questions"
python scripts/unfold.py check  diagram.json
python scripts/unfold.py build  diagram.json page.html
```
