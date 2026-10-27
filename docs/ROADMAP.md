# Unfold roadmap: from 0.3.0 to a public 1.0

## Positioning

> **Unfold understands your codebase, teaches it to you, and lets you shape the map to your purpose.**

Every feature below supports at least one of these three pillars:

| Pillar | Promise | Proof in the product |
|---|---|---|
| **Understands** | Every box is backed by code it actually read. | Staged reader, `source` on every node, a list of what was inferred, a drift check that keeps the map true. |
| **Teaches** | A newcomer ends up able to explain the system. | Zoomable levels, I/O marked at every level, hover hints, glossary, guided tours. |
| **Flexes** | The map serves *your* purpose: onboarding, review, a talk or docs. | A real editor, every common diagram type, media in any box, and export to every format people already use. |

Archify draws a diagram of whatever you describe. Unfold explains a codebase and keeps that explanation in sync with the code. Don't compete on the number of diagram types; compete on understanding and depth.

## Order of work

Fix the foundation before launching. A trending repo brings a wave of first-time users, and each one will hit the editor bugs in the first five minutes.

| Phase | Release | Theme | Size |
|---|---|---|---|
| 1 | 0.4.0 | Fix the canvas: links, layout, edge routing, editable edges, media | L |
| 2 | 0.4.0 | One-line install for every agent | S |
| 2b | 0.4.0 | Intent first: the skill asks what the map is for | S–M |
| 3 | 0.5.0 | Understands: drift check, re-mapping that keeps edits, permalinks, wider scanner | L |
| 4 | 0.5.0 | Teaches: guided tours, presentation mode, search | M |
| 5 | 0.6.0 | Flexes: diagram-type catalogue, export and import | L |
| 6 | 1.0.0 | Launch: gallery, README, distribution | M |

---

## Phase 1: fix the canvas (bugs first)

Write each fix test-first: add a failing case to `tests/test_e2e_page.py`, then fix the code until it passes.

### 1.1 Can't link a newly added node to existing nodes

**Status: not yet reproduced.** The existing e2e test only covers dragging a port onto *empty* canvas (`test_drag_port_to_empty_canvas_creates_linked_node_and_tab_chains`). Nothing tests dragging a port onto an *existing* node, so this path has no coverage.

Likely causes, in `engine/engine.js`:
- **Ports are invisible until hover.** `.port` has `opacity:0; pointer-events:none` and only shows on `.node:hover` or when the node is selected (`engine.css:69-70`).
- **The text editor hides the node.** Adding a shape immediately opens the inline text editor (`addNodeAt` → `startInline`). That textarea covers the node, so hovering the node doesn't register and its ports never appear.
- **Small targets.** Ports are 6 units in world space, so they shrink when you zoom out.
- **Strict drop target.** On release, `onUp` looks for a `.node` under the pointer with `elementFromPoint`. Missing a node by a few pixels creates a *new* node instead of linking, which looks like the link failed.

Fix:
- On release, snap to the nearest node within about 24 screen pixels. Highlight the candidate target while dragging.
- Give ports a fixed size in screen pixels, and show them on the selected node even while its text is being edited.
- Add a **Link** button to the floating toolbar: click it, then click the target node. This is easier on touch and trackpads than dragging a port.

**Acceptance criteria**
- *Given* a node just added from the palette, *when* I drag from any of its ports and release over an existing node, *then* a new edge connects the two nodes and is selected.
- *Given* a drag from a port, *when* I release within 24 px of a node's edge, *then* the edge connects to that node and no new node is created.
- *Given* a selected node, *when* I press Link and then click another node, *then* an edge connects them.

### 1.2 Arrow paths overlap

**Cause:** `edgeGeom` draws every edge as one cubic Bézier from the *centre* of a side to the *centre* of a side (`port()`). Every edge leaving the same side of a node starts at the same point, and every edge arriving on the same side ends at the same point. Fan-in and fan-out therefore overlap exactly. The router also ignores nodes in the way, which the README already lists as a limitation.

Fix:
- **Spread ports.** Give each edge its own attachment slot along a node side, ordered by the position of the node at the other end so the edges don't cross near the node.
- **Offset parallel edges.** When two edges join the same pair of nodes (A→B and B→A), offset each one sideways.
- **Route around nodes.** Add an `orthogonal` routing mode, which is easier to read for architecture diagrams, that avoids node boxes. Keep `curved` as an option.

### 1.3 Layouts look unstructured

**Cause:** `layoutLevel` is a simplified layered (Sugiyama-style) layout and misses two standard steps:
- **No placeholder nodes for long edges.** When an edge skips layers, it is drawn straight through whatever sits in the layers between, so lines cross boxes and crossing reduction can't see those edges.
- **No coordinate-assignment pass.** Each layer is simply centred, so chains that should run straight zig-zag. A standard alignment pass, such as Brandes–Köpf, straightens them.

**Decision needed: improve the in-house layout, or adopt ELK.js.** Run a short evaluation spike before choosing:
- **Problem:** dense levels look tangled.
- **Constraints:** pages must stay self-contained and work offline. Today the template is about 128 KB. ELK.js (Eclipse Layout Kernel) is a mature layered layout engine with port handling, orthogonal routing and nested nodes, but it adds roughly 1–2 MB to every page. Measure the exact size during the spike.
- **Compare both** on the example map plus three gnarly fixtures (a fan-in hub, a long pipeline, a graph with a cycle). Score them on edge crossings, edges passing through nodes, page size and layout time.
- **Recommendation to test:** extend the in-house layout first (placeholder nodes, an alignment pass, the router from 1.2). Switch to ELK only if the score gap is large.

**Acceptance criteria:** *Given* the three fixtures, *when* Tidy runs, *then* no edge passes through a node box, and the crossing count is no higher than in 0.3.0.

### 1.4 Editable edge paths (bend points)

Today an edge has no geometry of its own; its path is recomputed on every render. Add:
- **Schema:** `edge.points: [[x, y], …]` (optional bend points) and `edge.route: "curved" | "orthogonal" | "straight"`. Update `references/schema.md` and `unfold.py check` to match.
- **Editor:** double-click an edge to add a bend point, drag a bend point to move it, double-click it to remove it, and use a "Reset path" button on the edge toolbar. Show a midpoint handle on each segment for quick bending.
- **Moving nodes:** when an endpoint moves, keep the bend points in place, and only move bend points that sit next to the moved node. Tidy clears bend points after asking for confirmation.

**Acceptance criteria:** *Given* a selected edge, *when* I drag the handle on its middle segment, *then* a bend point is created, the path passes through it, and the bend point survives a reload and an export/import round trip.

### 1.5 Media in components (already supported, but hard to find)

What works today:
- Any node can hold an image, video or embed URL: floating toolbar → **Details** → **Media** (Upload or URL).
- A small play badge opens the media in a viewer.
- The **Image** shape shows the picture on the canvas itself.
- Local files are inlined by `unfold.py build`.

Gaps:
- **Dropping a file on an existing node creates a separate new image node** instead of attaching the file to that node (the `drop` handler in `boot()`). Fix: when a file is dropped on a node, attach it to that node.
- **No direct button.** Add a **Media** button straight on the floating toolbar, not only inside Details.
- **One item per node.** Allow `media` to be a list, shown as a gallery in the viewer, so one component can carry a screenshot, a short video and a diagram.
- **Not visible on the canvas.** Add an optional thumbnail on any node (`media.show: "thumb"`), not only on the Image shape.
- **Not mentioned in onboarding.** Add a line to the shortcuts card and to the README.

**Acceptance criteria:** *Given* a component node in edit mode, *when* I drop a PNG on it, *then* the node gains that media, no new node is created, and clicking the node's play badge in view mode opens the image.

---

## Phase 2: one-line install

Goal: someone with no prior context has a map within two minutes of finding the repo.

| Channel | Command | Work |
|---|---|---|
| Skills CLI (multi-agent) | `npx skills add mahmoud-nasif/Unfold` | Check that the CLI finds `skill/unfold/SKILL.md`. If it doesn't, move the skill to the path the CLI expects. |
| Claude Code plugin | `/plugin marketplace add mahmoud-nasif/Unfold` then `/plugin install unfold` | Add `.claude-plugin/marketplace.json` and a plugin manifest. A `/unfold` slash command comes free. |
| Shell installer | `curl -fsSL …/install.sh \| sh` | Detect the installed agents (Claude Code, Codex, Cursor, OpenCode) and copy the skill into each one's skills folder. Confirm each agent's current folder from its own docs, because these paths change. |
| claude.ai / Desktop | Upload `unfold.zip` | Already works. Add a direct link to the latest release asset. |
| Without an agent | `uvx unfold scan .` / `pipx install unfold` | Publish the standard-library scripts as a small PyPI package, so `scan`, `check`, `build` and `extract` work in CI. |

- Put a three-step **Quickstart** at the very top of the README: install, then the prompt to type, then a screenshot of the result.
- Add a CI job that installs through each channel into a clean container and runs `unfold.py check` on the example.

**Acceptance criteria:** *Given* a clean machine with Claude Code, *when* the user runs the one install command and asks "map this repo", *then* the skill triggers and writes a page, with no manual copying.

---

## Phase 2b: intent first

The same repo needs a different map depending on what it's for. A newcomer needs breadth and a path through the system. A demo needs a short story and visuals. A question about one detail needs depth on one path and very little else. Today, step 1 of `SKILL.md` ("Frame the request") asks about scope, audience, focus and confidentiality, but never asks *why*. Intent becomes the first thing the skill settles.

### The question

Ask only when the prompt doesn't already make the intent clear. For example, "walk me through this project" already means *learn*, so the skill shouldn't ask. Ask it as one question, with these options:

| Intent | Example prompt |
|---|---|
| **Learn the codebase** | "I'm new here, help me understand this repo." |
| **Demonstrate my work** | "I'm presenting this at Friday's review." |
| **Explain a specific detail** | "How does the retry logic in the uploader work?" |
| **Review a change** | "What does this PR change in the system?" |
| *Other (free text)*, which also covers: **document / hand over**, **debug: trace one path**, **plan a refactor or migration**, **audit data flow** (security, privacy) | "Find where user data leaves the system." |

After that, ask at most **two** follow-ups, chosen by intent. Examples: *Who's the audience, technical or not?* (demonstrate). *Which detail or entry point?* (explain). *Which branch or PR?* (review).

### What each intent changes

| | Learn | Demonstrate | Explain a detail | Review a change |
|---|---|---|---|---|
| **Scope** | Whole system | The parts worth showing | One flow, file or feature | What the change touches, plus one ring of neighbours |
| **Depth** | Even, with extra depth on the core | Shallow, 2–3 levels | Deep on one path, minimal context | Deep on the touched parts |
| **Default diagram types** | Architecture, then process and data | Architecture with outcome-first notes | Sequence or process along the path | Architecture with diff highlighting |
| **Tour** | "Start here" tour plus quiz cards | Presentation-mode tour with speaker notes | Step-by-step walk of the path, `file:line` at each hop | "What changed and why" tour |
| **Media** | Optional | Prompts the user for screenshots and videos per component | None | None |
| **Source citations** | Visible | Kept, but quiet | Prominent | Prominent, with permalinks to the diff |
| **Glossary** | Full | Short, plain language | Only the terms the path uses | Not needed |

Additional intents reached through *Other*:
- **Document / hand over:** full coverage, a source on every node, and drift checking set up.
- **Debug:** one request or data path, end to end, with every hop cited.
- **Refactor:** the current state plus coupling hotspots, with dependency-graph levels.
- **Audit:** data-flow levels with trust boundaries and external sinks highlighted.

### Implementation

- **`SKILL.md`, step 1:** add intent as the first item in "Frame the request", along with the rule above for when to skip the question.
- **`references/intents.md`:** one section per intent covering scope, depth, level types, tour and the follow-up questions. `SKILL.md` links to it; this keeps the main file short.
- **Schema:** add `meta.intent` (and `meta.audience`). A re-run or an extension of an edited page reuses the same framing instead of asking again. The engine uses it for defaults: start presentation mode for `demonstrate`, start the tour for `learn`.
- **Evals:** add one case per intent under `skill/unfold/evals/`, plus one case checking the skill **doesn't** ask when the prompt already says what it wants.

**Acceptance criteria**
- *Given* the prompt "map this repo" with no other context, *when* the skill starts, *then* it asks for the intent before scanning, using the four options plus Other.
- *Given* the prompt "how does the retry logic in the uploader work?", *when* the skill starts, *then* it does not ask for the intent, and the page's top level is that one flow, with no more than one level of surrounding context.
- *Given* the intent *demonstrate*, *when* the page is delivered, *then* `meta.intent` is `demonstrate`, the page opens in presentation mode, and the skill has asked for media for the components shown.

---

## Phase 3: Understands

| Feature | What it is | Why it's ours |
|---|---|---|
| **Drift check** | `unfold.py drift diagram.json --repo .` reports each node whose `source` file or symbol no longer exists or has moved. It ships as a GitHub Action that comments on PRs. | Every box already has a `source`, so this is cheap for us. It fixes the "diagrams go stale" problem the README itself names. |
| **Re-map that keeps edits** | Re-scan after code changes, show what was added, removed and changed, and merge new findings into the map without overwriting hand edits (labels, positions, media, bend points). Track which fields were edited by a person. | Without this, the editor is a one-shot tool. |
| **Commit-pinned permalinks** | `source` links open the exact file and line at the mapped commit, on GitHub, GitLab or a local editor (`vscode://`). | Makes "verifiable" one click away. |
| **Confidence marking** | Every node is marked `read`, `peeked` or `inferred`, shown as a subtle badge and as a filter. | Turns the honesty rule into something the reader can see. |
| **Wider scanner** | Framework-aware detection: Spring, NestJS, FastAPI/Django, Express, ASP.NET, gRPC/protobuf, Kafka and other message queues, Terraform and k8s manifests. Each gets a fixture repo and unit tests. | Most potential users work in these stacks. |
| **Map diff** | `unfold.py diff old.json new.json` produces a page with added, removed and changed elements highlighted. | Useful in PR review. Archify has a version of this. |

## Phase 4: Teaches

| Feature | What it is |
|---|---|
| **Guided tours** | `meta.tours`: named paths (for example "Request lifecycle" or "Your first bug fix"). Each step has a level, a focus node and a one-paragraph narration. Next and Back controls, plus a progress dot per step. The skill writes one tour by default. |
| **Presentation mode** | Full screen, chrome hidden, arrow keys step through a tour, with speaker notes in a second window. Serves "I'm bad at presenting what I built". |
| **Search** | `/` opens a search across every level (labels, notes, sources, glossary); picking a result flies to it. |
| **"Where is X?"** | Type a file path and see every node that cites it. This is the reverse of `source`. |
| **Check yourself** | Optional quiz cards at the end of a tour ("Which part writes to the database?"), answered by clicking a node. |

## Phase 5: Flexes, the diagram-type catalogue

"Every diagram type" has no end, so the catalogue is limited to types that are either **derivable from code** or **common in presentations**, checked against Mermaid, PlantUML, draw.io, Structurizr (C4) and archify. Everything else comes in through Mermaid import.

| Type | Seen in | From code? | Priority |
|---|---|---|---|
| Architecture / component | all | yes | ✅ have |
| Process / flowchart / activity | Mermaid, PlantUML, archify | yes | ✅ have |
| Sequence | Mermaid, PlantUML, archify | yes | ✅ have |
| State machine / lifecycle | Mermaid, PlantUML, archify | yes | ✅ have |
| Data model / ERD | Mermaid, PlantUML, archify | yes | ✅ have |
| **Class / object** | Mermaid, PlantUML, archify | yes (outline) | P1 |
| **C4 context / container / component** | Structurizr, Mermaid | yes | P1 (maps naturally onto our levels) |
| **Deployment / infrastructure** | PlantUML, draw.io | yes (Docker, compose, k8s, Terraform) | P1 |
| **Dependency graph** (modules and packages) | many tools | yes (import graph) | P1 |
| **Data flow (DFD)** | archify | yes | P2 (architecture with typed stores) |
| **Call graph** | IDE tools | yes | P2 |
| **ROS 2 node graph** | rqt_graph | yes (scanner already finds topics) | P2 |
| **Behaviour tree** | Groot, py_trees | yes | P2 |
| **Mind map / tree** | Mermaid, archify | no | P2 (glossary and overview) |
| **Timeline / Gantt** | Mermaid, archify | partly (git history) | P3 |
| **Use case** | PlantUML | no | P3 |
| **User journey** | Mermaid | no | P3 |
| **Swimlane / BPMN** | draw.io | no | P3 (process with lanes) |
| **Waterfall / trace** | archify | from logs or traces only | P3 |
| Charts (pie, XY, Sankey) | Mermaid | no | Out of scope: use a chart tool |

**Export and import**

| Format | Direction | Priority |
|---|---|---|
| PNG / SVG of the current level | export | P1 |
| PDF of all levels, one per page | export | P1 |
| Mermaid | export per level; import whole | P1 |
| draw.io (`.drawio`) | export | P2 |
| Excalidraw | export | P2 |
| Structurizr DSL (C4) | export | P3 |
| README embed (SVG + link to the live page) | export | P1 |

**Other editor improvements:** alignment guides and distribute; swimlanes; edge label placement; a custom icon set (SVG upload); per-level themes; snapping links to group borders.

---

## Phase 6: launch

- **Gallery:** maps of 8–10 well-known open-source repos (for example FastAPI, Redis, a ROS 2 demo stack, a React app, a CLI in Rust), hosted on GitHub Pages and linked from the README.
- **README rewrite:** the pillar line, a 20-second GIF, Quickstart, the gallery, a comparison table ("Unfold vs a diagram generator") and a list of supported agents.
- **Distribution:** skills directories and awesome-lists, Show HN, the Claude, ROS and dev-tooling communities, a short demo video.
- **Feedback loop:** issue templates for "the map got X wrong", plus a `--report` flag that bundles `outline` output for a bug report, with no code included.

## Decisions taken

1. **Layout engine: our own.** ELK.js 0.9.3 is 1.6 MB (467 KB gzipped) against a 128 KB page and is EPL-2.0 or GPL-3.0. The in-house layout now keeps lanes for long edges, straightens chains, packs group bands, and routes edges around nodes.
2. **Agents: all that read Agent Skills**, through the skills CLI, the Claude Code plugin and `install.sh` / `install.ps1`.
3. **Package name: `unfold-map`.** `unfold` is taken on PyPI and npm; `unfold-map` was free on both on 2026-10-26.
4. **Licence: MIT**, like gitdiagram, repomix, Mermaid, Excalidraw and the skills CLI. (archify, draw.io and Structurizr are Apache-2.0; PlantUML is LGPL.)
5. **One `main` branch.** Users get clean artefacts from it: the release zip, the installers and `.gitattributes` keep developer tooling out.

## Status after 0.4.0

| Phase | State |
|---|---|
| 1 Fix the canvas | Done. Linking, layout, routing, bend points and media, each with browser tests. On the three layout fixtures, edge segments passing through nodes went from 11 / 2 / 6 to 0 / 0 / 0, and edge pairs lying on top of each other from 14 / 4 / 2 to 3 / 0 / 0. Crossings went up (7 / 6 / 10 to 12 / 9 / 14), because routes now detour around boxes instead of cutting through them. Reducing crossings is the next layout task. |
| 2 One-line install | Done. `install.ps1` passes on Windows in CI; `unfold-map` is published to PyPI by the release workflow. |
| 2b Intent first | Done: SKILL.md step 1, `references/intents.md`, `meta.intent`, engine defaults, eval cases. |
| 3 Understands | Done: drift check and action, re-map merge, permalinks, confidence, map diff, wider scanner, token budget. Open: incremental layout for nodes added by `merge` (it places them in a column today). |
| 4 Teaches | Done: tours, presentation, notes, search, quiz. |
| 5 Flexes | Done: 7 more level types, PNG/SVG/PDF, Mermaid, draw.io, Excalidraw, Mermaid import. Open: Structurizr export, swimlanes, alignment guides, custom icons. |
| 6 Launch | Started: the gallery page and a map of every type. Open: maps of well-known open-source repos, refreshed README GIFs (`make media` needs ffmpeg), a demo video, and distribution. |
