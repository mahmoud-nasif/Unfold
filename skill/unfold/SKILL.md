---
name: unfold
description: Read a codebase and unfold it into an interactive, zoomable map of what the system does, so a newcomer reaches a developer's understanding. The overview is an architecture diagram with inputs and outputs marked; clicking a part zooms into what fits its code (architecture, process flowchart, sequence diagram, state machine, data model) or opens a screenshot or video. Boxes cite their source files, hover traces data flow and shows a one-line hint, and a built-in editor (shape palette, floating toolbar, nest/group, inline text, media upload) lets anyone refine it. Use whenever someone wants to understand, explain, present, document, review or onboard people onto a codebase, repo, service, pipeline, ROS 2 stack, firmware or app, e.g. "diagram this repo", "how does this code work", "architecture overview", "show the data flow", "walk me through this project", "zoomable/drill-down diagram" or "I'm bad at presenting what I built", even if they never say diagram.
license: MIT
---

# Unfold

Produces one self-contained HTML page: an overview that unfolds, level by level, into the parts of a system. The engine (`assets/template.html`) draws, lays out, zooms, traces and edits. **Your job is to understand the code and write the diagram data** (JSON), so that a reader who knows nothing about the project ends up able to explain it.

At every level, the page answers three questions: *what comes in, what happens to it, what comes out.*

## Quality bar

- **Accurate.** Every node and edge is backed by code you have actually looked at. Its `source` says where: `path/file.py:symbol`. Anything inferred gets listed to the user.
- **Fitted to the codebase.** Use the project's own vocabulary (module names, topic and route names verbatim) and the diagram type that fits each part (see step 4).
- **Quiet.** Labels have 2 to 4 words, captions one line, notes 1 to 3 sentences, and nothing else. Detail lives one click or one hover away, never on the canvas.
- **Navigable from zero.** `meta.summary` says what the system is for in one sentence. A short `meta.glossary` defines the project's jargon. Notes open with a sentence that works as a hover hint.

## Workflow

### 1. Frame the request

From the conversation, or one short batch of questions, settle:

- **scope:** which repo or part of it;
- **audience:** new developer, reviewer, manager or talk;
- **focus:** the part that matters most, which gets the most depth;
- **confidentiality:** pages get shared, so leave out hosts, secrets, customer names and unreleased plans unless told otherwise.

If there is no code, work from the user's description. Never invent parts, flows or numbers.

### 2. Read the codebase in stages, within a budget

Large repos don't fit in context, and skimming whole files wastes it. Read in stages and stop as soon as the diagram is grounded.

| Stage | Command | What you get | Cost |
|---|---|---|---|
| Map | `python scripts/scan_repo.py REPO` | languages, layout, manifests, entry points, I/O signals with `file:line`, imports between parts, a *read these first* list | small |
| Shape | `python scripts/scan_repo.py REPO --outline [PREFIX]` | every class and function, with signature and first docstring line, without bodies | medium |
| Evidence | `python scripts/peek.py REPO file:line file:symbol ...` | only the lines around each reference, merged, within a fixed line budget | small per call |
| Depth | read whole files | only the 3 to 8 files that carry the core logic in the user's focus area | large |

How to work through the stages:

- Start with README, docs, and the Map.
- Use the Outline on the folders that matter. For a large repo, run it per top-level part rather than on everything.
- Use `peek` for every I/O signal and entry point you plan to draw, and for the function behind every process level.
- Read whole files only where the logic is genuinely intricate.
- Keep a running **evidence list** (node → `file:symbol`). It becomes the `source` fields.
- The scan is regex-based: it misses dynamic wiring and reports some false positives, such as patterns inside strings. Confirm with `peek` before drawing.

### 3. Fix the system boundary

List the inputs (requests, subscribed topics, CLI arguments, files read, sensors, config) and the outputs (responses, published topics, files written, commands, DB writes). Mark them with `"role": "input"` or `"role": "output"` at every architecture and process level.

### 4. Choose the diagram for each level

The overview is always `architecture`: 4 to 10 parts, stores and externals, with inputs on the left and outputs on the right. Each part worth opening gets the child type its code calls for:

| The code inside is… | `type` | Draw |
|---|---|---|
| Several parts that call or message each other | `architecture` | `rounded` parts, `cylinder` stores, `cloud` externals |
| One sequence of steps over an input: a handler, pipeline, job or algorithm | `process` | `pill` start/end, `rect` steps, `diamond` decisions with labelled branches, dashed loop-backs |
| An interaction across parts over time: a request lifecycle, handshake, action goal | `sequence` | participants as nodes, left to right; messages as edges *in order*; dashed for returns |
| Behaviour driven by states and events: a state machine, mode manager, connection, behaviour tree status | `state` | `initial` and `final` markers, `pill` states, edges labelled with the event or guard |
| Data structures, schemas, ORM models, message definitions | `data` | `table` nodes with `fields` (`"id: int PK"`), edges labelled with cardinality |

Go deeper where the code does, and stop where a note would do. Open a part only if its inside has 3 or more meaningful elements. Keep each level to about 12 nodes; past that, nest. `references/reading-code.md` has patterns for web services, ROS 2, pipelines, CLIs, firmware, frontends and monorepos.

### 5. Add visuals where the code has them

If the repo contains screenshots, architecture images, demo GIFs or videos (look in `docs/`, `assets/` and the README), attach them with `"media": {"src": "relative/path.png"}`. Use a node with `"shape": "image"` to show the picture on the canvas, or add `media` to any node to make it open in a viewer.

`unfold.py build` inlines local files. Published claude.ai pages block remote images, so prefer local files.

### 6. Write the words

- `meta.summary`: one sentence on what the system does for whom.
- `meta.glossary`: up to 8 project terms, each with a definition of 10 words or fewer.
- `caption` per level: one line on purpose, e.g. "Every goal is checked for reachability before the arm moves".
- `note` on a node: its first sentence is shown on hover, so make it stand alone; up to two more sentences go in the detail card.
- Edge labels: what flows, in 1 to 3 words.

### 7. Check, review, build

```bash
python scripts/unfold.py check   diagram.json     # errors fail; read every warning
python scripts/unfold.py outline diagram.json     # the whole tree on one screen
python scripts/unfold.py build   diagram.json page.html
```

Read the outline as if you were the newcomer:

- Can you explain the system from it?
- Does every level answer in → process → out?
- Is each child the right type?

If browser automation such as Playwright is available, screenshot the overview and one inner level of each type, and fix overlaps or crossings.

### 8. Deliver

On claude.ai with the Artifact tool, publish `page.html` from `/mnt/user-data/outputs/` with `capabilities: {"artifact": {}, "downloads": true}`, which enables **Save** and **Export**. Elsewhere, hand over the file; it works offline.

Then tell the user, in a few lines:

- what the overview shows;
- which parts are inferred;
- how to read the page: click to open, hover to trace, Esc or zoom out to go back, and **Edit** to change things.

If the user later edited the page, continue from `python scripts/unfold.py extract page.html diagram.json`, not from your old copy.

## Reference

- `references/schema.md`: every field, level type, shape and colour.
- `references/reading-code.md`: turning code into levels, with per-ecosystem patterns.
- Don't change `assets/template.html` for one diagram. Engine changes belong in the repository, with tests.
