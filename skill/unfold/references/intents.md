# Intents: what the map is for

The same repo needs a different map depending on why someone wants it. Settle the intent before scanning (SKILL.md step 1), record it as `meta.intent`, and use the section below for the defaults. The user's own instructions always win over these defaults.

## Contents

- [Choosing the intent](#choosing-the-intent)
- [Learn the codebase](#learn-the-codebase) (`learn`)
- [Demonstrate my work](#demonstrate-my-work) (`demonstrate`)
- [Explain a specific detail](#explain-a-specific-detail) (`explain`)
- [Review a change](#review-a-change) (`review`)
- [Plan something new](#plan-something-new) (`plan`)
- [Other intents](#other-intents): `document`, `debug`, `refactor`, `audit`, `other`
- [What the page does with the intent](#what-the-page-does-with-the-intent)

## Choosing the intent

Infer it when the prompt makes it clear, and don't ask:

| The prompt says something like… | Intent |
|---|---|
| "I'm new here", "walk me through this project", "onboard me", "help me understand this repo" | `learn` |
| "I'm presenting this", "demo at Friday's review", "I'm bad at presenting what I built", "for my talk" | `demonstrate` |
| "How does X work?", "where does Y happen?", one named function, flow, file or feature | `explain` |
| "What does this PR / branch / diff change?", a PR link or branch name | `review` |
| "Document this", "hand this over", "for the wiki" | `document` |
| "Why does this request fail?", "trace this path end to end" | `debug` |
| "We want to split / migrate / replace X" | `refactor` |
| "Where does user data leave the system?", security or privacy review | `audit` |

Otherwise ask one question with the options **Learn the codebase**, **Demonstrate my work**, **Explain a specific detail**, **Review a change**, and **Other** (with document or hand over, debug one path, plan a refactor, audit data flow as examples). A bare "map this repo" is not clear: ask.

After the intent, ask **at most two** follow-ups from that intent's list, and only the ones the conversation hasn't answered. Ask them together with scope, focus and confidentiality questions in the same short batch, never in a second round.

## Learn the codebase

For a newcomer who must end up able to explain and change the system.

- **Scope:** the whole system.
- **Depth:** even across parts, with one extra level on the core (the part the user names, or the one with the most logic).
- **Level types:** architecture overview; process for handlers, pipelines and jobs; data for the main models. Sequence and state where the code calls for them.
- **Tour:** a "start here" path: order the overview from input to output and make each caption say what to look at next. Recommend a first file to read in the delivery message.
- **Media:** optional; attach screenshots already in the repo.
- **Citations:** `source` on every node, visible.
- **Glossary:** full, up to 8 terms.
- **Follow-ups:** *Which part will you work on first?* *How much do you know already: the language, the domain, neither?*

## Demonstrate my work

For showing what was built to an audience: a review, a talk, a portfolio.

- **Scope:** the parts worth showing; leave plumbing out.
- **Depth:** shallow, 2 to 3 levels.
- **Level types:** architecture with outcome-first notes ("Finds the part in under a second", not "Calls detect()"). One process or sequence level for the most impressive flow.
- **Tour:** a short story in presentation order: problem, how it works, result. Captions read like slide titles.
- **Media:** always ask the user for screenshots, GIFs or videos of the components shown, naming any the repo already has, and attach them (`media`). If they have none yet, deliver without and say which nodes would benefit.
- **Citations:** keep `source`, but keep notes free of file paths.
- **Glossary:** short, plain language.
- **Follow-ups:** *Who's the audience: technical or not?* *How long is the slot, and what should they remember?*

## Explain a specific detail

For one question about one flow, file or feature.

- **Scope:** that one path. The top level is the flow itself, with at most one level of surrounding context.
- **Depth:** deep on the path; minimal everywhere else (a context node per neighbour, no children).
- **Level types:** sequence or process along the path; state if the detail is a mode machine.
- **Tour:** a step-by-step walk of the path, with `file:line` in the `source` of every hop.
- **Media:** none.
- **Citations:** prominent: every step has a `source`, and notes quote names verbatim.
- **Glossary:** only the terms the path uses.
- **Follow-ups:** *Which detail or entry point?* (only if the prompt doesn't name it) *What prompted the question: a bug, a change you're planning, curiosity?*

## Review a change

For a reviewer who needs to see what a PR or branch touches.

- **Scope:** what the change touches, plus one ring of neighbours. Read the diff first (`git diff BASE...HEAD --stat`, then the hunks).
- **Depth:** deep on the touched parts; neighbours stay closed.
- **Level types:** architecture, with touched nodes marked: `tag: "changed"`, `"added"` or `"removed"`, and a note on what changed and why. Process or sequence for a changed flow.
- **Tour:** "what changed and why", in the order a reviewer should read the diff.
- **Media:** none.
- **Citations:** prominent; cite the changed files and symbols.
- **Glossary:** not needed.
- **Follow-ups:** *Which branch or PR, against which base?* *Anything you're worried about in it?*

## Plan something new

For designing before building: there is no code to scan, or the user wants to think a system through first and then have it built. The conversation is the source, and the map is the plan. The whole procedure is in `references/plan-mode.md`.

- **Scope:** what the user describes, nothing invented.
- **Depth:** the overview, plus a process or sequence level only for parts where a decision was made.
- **Tags:** every part is `planned`; unresolved choices are `open question`.
- **Follow-ups:** *What should it do, and for whom?* *What is already decided or fixed (language, hardware, existing systems)?*

## Other intents

Reached through **Other**, or inferred from the prompt.

| `meta.intent` | Scope and depth | Emphasis | Follow-ups (pick at most two) |
|---|---|---|---|
| `document` (document or hand over) | Full coverage, even depth | `source` on every node; full glossary; captions that still make sense in a year | *Who takes it over?* *Where will it live?* |
| `debug` (trace one path) | One request or data path, end to end | Every hop cited with `file:line`; decisions and error branches drawn | *Which request or symptom?* *Where does it go wrong, if known?* |
| `refactor` (refactor or migration of existing code) | The current state of the area | Coupling hotspots: draw imports and calls between parts, mark the ones that block the change with `tag` | *What's the target state?* *What must not break?* |
| `audit` (audit data flow) | Data-flow levels across the system | Trust boundaries as `groups`; external sinks (`cloud` nodes) and stores of personal data marked with `role: "output"` and a `tag` | *Which data: personal, secrets, payments?* *Which boundary matters: network, process, vendor?* |
| `other` | As the user describes | Note the user's own words in `meta.audience` or the summary | Ask what a good map would let them do |

## What the page does with the intent

- `learn`: the About card offers **Start the tour** on the first visit. Write a tour (`meta.tours`) that ends with one quiz step.
- `demonstrate`: the page offers **Present** as soon as it opens. Write a tour with speaker `notes`; presenting goes full screen and the presenter opens the notes window with `N`.
- Any other intent: the page behaves as usual; readers can still take the generated tour from **Tour**.

See `references/schema.md` (Tours) for the step fields.
