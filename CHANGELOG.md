# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.1] - 2026-10-27

### Fixed
- Links no longer run on top of each other. Ends sharing a node side are placed where each link wants to go (straight across when the nodes line up), fans of curves nest instead of overlapping, routed links that share a lane are nudged apart, and each side's ends are re-ordered by where routes really arrive.

### Added
- Automated releases: merging a version bump (`make bump V=X.Y.Z`) to `main` tags it, publishes the GitHub release with its changelog notes, and publishes `unfold-map` to PyPI through trusted publishing.
- `unfold-map` on PyPI: `pipx install unfold-map` gives the `unfold` command.

### Changed
- CI: browser tests run in Playwright's container image and in parallel (about 14 minutes down to about 2); runs on a pull request cancel the run they replace; documentation-only changes skip CI.
- README links and images are absolute, so the PyPI page renders them.

## [0.4.0] - 2026-10-26

Unfold now teaches as well as maps: guided tours, presentation mode and search. Links route around boxes and can be bent by hand. Seven more diagram types, exports to the tools people already use, a token budget for reading code, a drift check, and one-line installs for many agents.

### Added
- Routing: edges go around nodes, ends are spread along each side, and later routes avoid lanes and crossings earlier ones took. Per-level and per-edge paths: `curved` (default), `orthogonal` or `straight` (`route`).
- Bend points: `edge.points`. Drag an edge's midpoint handle to add one, drag to move (it snaps level with its neighbours), double-click to remove; **Reset path** and **Tidy** clear them.
- Linking: release on or near a node to link it; a **Link** button links the selection to the next node clicked. New shapes land in free space.
- Media: several items per node (`media` may be a list), a thumbnail badge, a gallery viewer with arrow keys, a **Media** button in the toolbar, and files dropped on a node attach to it.
- Level types `class` (compartments, `methods`, `stereotype`, UML `rel` on edges), `c4` (`person` shape, `tech` line), `deployment` (`node3d` shape), `dependency`, `tree`, `behaviour` (`bt` roles, execution order kept) and `timeline` (`date`), with tree and timeline layouts.
- Tours: `meta.tours` with steps across levels, spotlight, speaker `notes` and `quiz` steps; a generated tour when none is written. Presentation mode (`P`), notes window (`N`), search (`/`) across levels, sources and glossary.
- `meta.intent` and `meta.audience`; the skill asks for the intent first (`references/intents.md`). `learn` pages offer the tour, `demonstrate` pages offer to present.
- `confidence` on nodes (inferred parts are marked), `meta.repo` permalinks to the mapped commit, and `diff` marks with a legend.
- Export: PNG and SVG of a level, a README embed, PDF of all levels via print, Mermaid (Markdown, all levels), draw.io (one linked page per level) and Excalidraw. Import from Mermaid flowchart, sequence, state, class and ER diagrams.
- `scan_repo.py`: `--budget`, `--section`, `--changed-since`, a per-file cache, cost footers, skipping of generated, vendored, minified and ignored files, collapsed repeats, and detection for Spring, NestJS, FastAPI, Flask, Django, Express, ASP.NET, gRPC, Kafka, RabbitMQ, NATS, Redis, Terraform, Kubernetes and GitHub Actions. `peek.py --budget`.
- `unfold.py drift`, `diff`, `merge` and `build --repo`; a composite GitHub Action for drift checks.
- Installers: the skills CLI, a Claude Code plugin marketplace, `install.sh` and `install.ps1` for 20 agents, and the `unfold-map` Python package (not yet published).
- Examples: a gallery page and a map of every diagram type. Eval cases for each intent.

### Changed
- Auto-layout keeps a lane for every long edge, straightens chains, and lets groups that follow each other share a line instead of stepping diagonally.
- Ports keep their size on screen at any zoom and have a wider grab area.
- The example map's sources use full paths, carry confidence marks and pass `drift`; it has a tour that ends with a question.
- `.gitattributes` keeps developer tooling out of source archives.


## [0.3.0] - 2026-10-25

Renamed to **Unfold**. The map now speaks five diagram languages, opens media, guides first-time readers, and the skill reads code in budgeted stages.

### Added
- Level types `sequence` (participants with lifelines; messages in time order; numbered; self-calls; returns dashed), `state` (initial and final markers, events on transitions) and `data` (entity tables with fields; PK and FK; cardinality).
- Media: `media` on any node opens an image, video or embed in a viewer; the `image` shape shows it on the canvas. Upload from the toolbar, drop files on the canvas, and `unfold.py build` inlines local media paths.
- Navigation: a back button by the breadcrumb; zoom out past a level to leave it; browser Back; the mouse back button; Backspace; double-click on empty canvas.
- Guidance: `meta.summary` and `meta.glossary` in an About card shown once to new visitors; one-line hover hints from the first sentence of a node's note.
- `scan_repo.py --outline`: a symbol map (signatures and first docstring lines, no bodies) for Python, JS/TS, Go, Rust, C/C++ and Java; a *read these first* ranking; one-package repos split into sub-packages for the import graph.
- `scripts/peek.py`: print code around `file:line`, `file:start-end` or `file:symbol`, merged, within a line budget.
- Editor: a diagram-type selector per level; message reordering in sequences; fields and media in the details popover; 4 new palette shapes.

### Changed
- `SKILL.md` follows a staged reading protocol (map → shape → evidence → depth) and picks a diagram type per part from what its code is.
- Design pass: quiet hairline chrome without shadows; elevation only for things that float over content. Input/output key moved into the level bar.
- Package, skill and CLI renamed: `skill/unfold`, `scripts/unfold.py`, `unfold.zip`.


## [0.2.0] - 2026-10-25

The skill now reads a codebase and explains what the system does. Story mode is replaced by data-flow tracing, and the side-panel editor by a real diagram editor.

### Added
- `scripts/scan_repo.py`: a codebase inventory covering languages, layout, manifests (npm, Python, Cargo, Go, CMake, ROS 2 package and launch files, Docker, compose, Make), entry points, I/O signals (HTTP, ROS 2 with message types, queues, CLI, env, files, databases, network, hardware) and internal imports. Every finding has `file:line`.
- Level types: `architecture` (parts and data flow) and `process` (steps, decisions, loops). The overview is architecture; modules open into whichever fits their code.
- Input and output roles, with badges, halos and a legend. Hover tracing lights up everything upstream and downstream.
- Node `source` references, shown with the note in a detail card.
- 12 shapes: component, step, start/end, decision, data, database, document, preparation, cloud, circle, triangle and free text.
- Auto-layout: layered, with cycle breaking, source pulling, banded groups, wrapping of long flows, and arcs for backward edges. It picks the direction that fits the screen best.
- Editor: a shape palette with drag and drop; in-place text editing; port-drag linking (dropping on empty canvas creates a node); Tab to chain steps; a floating selection toolbar (shape, colour, icon, In/Out, text size, bold, italic, details, duplicate, delete); marquee select; copy, paste, cut and duplicate; arrow nudging; group and ungroup; Tidy; layout direction toggle.
- Nest: collapse a selection into a module, rewiring edges that cross the boundary and marking the inner In/Out nodes. Expand reverses it, and Nest also creates an empty architecture or process level.
- `unfold.py outline` for a one-screen structural review; `check` and `outline` also accept built pages.
- `references/reading-code.md`: how to turn code into levels, with patterns for web services, ROS 2, pipelines, CLIs, firmware, frontends and monorepos.
- Eval case `diagram-a-codebase` with a fixture repository.
- The example is now this repository, diagrammed by its own skill.

### Changed
- `SKILL.md` rewritten around scan → boundary → levels → check → deliver.
- Schema v2: `shape`, `role`, `color`, `source`, `text`, level `type` and `direction`, and groups by membership. v1 pages still open: `kind` maps to `color`, rectangle groups become membership, and `stats` and `story` are ignored.

### Removed
- Story mode (play/pause narration), the side-panel inspector, node stats, and the fictional greenhouse example.


## [0.1.0] - 2026-10-25

### Added
- Zoomable story engine: nested diagrams with a camera zoom into any module and unlimited depth.
- Story mode: a scripted path across levels with focus highlighting and keyboard navigation.
- In-browser editor: drag, rename, relink, icons, kinds, groups, tags, stats, inner diagrams, story steps, undo and redo.
- Persistence: an unsaved draft is kept in the browser, Export gives HTML or JSON, and the page can save into itself as a claude.ai artifact.
- `unfold.py` CLI with `check`, `build` and `extract`.
- `SKILL.md` with schema and storytelling references, plus three eval cases.
- Fictional Verdant greenhouse example, unit and browser tests, CI, release and Pages workflows.
