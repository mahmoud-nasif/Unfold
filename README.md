<div align="center">

# Unfold

**Turn any codebase into an interactive map that explains it.**

[![CI](https://github.com/mahmoud-nasif/Unfold/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mahmoud-nasif/Unfold/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/mahmoud-nasif/Unfold)](https://github.com/mahmoud-nasif/Unfold/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/mahmoud-nasif/Unfold/blob/main/LICENSE)
[![PyPI](https://img.shields.io/pypi/v/unfold-map)](https://pypi.org/project/unfold-map/)
[![Agent Skill](https://img.shields.io/badge/Agent%20Skill-Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20Cursor%20%C2%B7%20more-555)](https://github.com/mahmoud-nasif/Unfold/blob/main/docs/install.md)

[Gallery](https://mahmoud-nasif.github.io/Unfold/) · [Install](#install) · [Features](#features) · [How it works](#how-it-works) · [Changelog](https://github.com/mahmoud-nasif/Unfold/blob/main/CHANGELOG.md)

</div>

Unfold is an agent skill for Claude Code, Codex, Cursor and other coding agents. Point it at a repository and it writes one HTML page that explains the system. The page starts with an architecture overview, its inputs and outputs marked. Each part opens into the diagram that fits its code: a flowchart for a request handler, a sequence diagram for a handshake, a state machine for a mode manager, a class diagram for an object model.

Every box cites the file and symbol it came from. A guided tour walks a newcomer through the map. A built-in editor lets you reshape it for onboarding, a design review or a talk.

![Exploring a map: hover to trace data, open a part, step back out](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/explore.gif)

## Why Unfold

Most tools give you **a picture of a repository**. Unfold gives you **a map you can learn the codebase from, check against the code, and change**.

| Instead of… | Unfold gives you |
|---|---|
| One generated diagram that is either too dense to read or too shallow to teach | A small overview where every part opens into the diagram its code calls for: a flowchart for a handler, a sequence for a handshake, a state machine for a mode manager, a class diagram for an object model |
| A diagram you have to take on trust | A source reference on every box, a mark for each part saying whether it was read or inferred, and a drift check that fails CI when the code moves on |
| A picture to look at | A map that teaches: guided tours across levels with a check-yourself question, search by part or file, and presentation mode with speaker notes |
| Regenerating from scratch when something is wrong | A full diagram editor, and re-mapping that keeps your edits when the code changes |
| A hosted service, a separate API key, or one agent only | A skill inside the agent you already use (Claude Code, Codex, Cursor and others). The result is one HTML file that works offline. |
| A format you're locked into | Export to Mermaid, draw.io, Excalidraw, PNG, SVG and PDF, and import from Mermaid |

It also keeps reading costs down on large repositories: the agent maps the repo, outlines it, then reads only the code it needs, within a token budget.

## What it's for

| You want to… | Ask your agent | You get |
|---|---|---|
| **Get up to speed** on an unfamiliar codebase | *"I'm new here, walk me through this repo."* | The whole system at even depth, a tour from inputs to outputs, and a question at the end to check yourself |
| **Present** what you built | *"I'm demoing this at Friday's review."* | A shorter map with screenshots of each part, a tour with speaker notes, and presentation mode |
| **Understand one detail** | *"How does the retry logic in the uploader work?"* | That one flow traced step by step, with a file and line at every step |
| **Review a change** | *"What does this PR change in the system?"* | The parts the change touches, with what was added, removed or changed marked |
| **Document or hand over** | *"Document this service for the wiki."* | Full coverage, a source on every box, and a drift check for CI |

Unfold asks what the map is for when your request doesn't say, and shapes the result to match.

## Install

```bash
npx skills add mahmoud-nasif/Unfold
```

The [skills CLI](https://github.com/vercel-labs/skills) installs into Claude Code, Codex, Cursor, OpenCode, Gemini CLI, GitHub Copilot and other agents that read Agent Skills. You can also install it these ways:

| | |
|---|---|
| **Claude Code plugin** | `/plugin marketplace add mahmoud-nasif/Unfold`, then `/plugin install unfold@unfold` |
| **Installer script** | `curl -fsSL https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/install.sh \| sh` (on Windows: `irm …/install.ps1 \| iex`) |
| **claude.ai and Claude Desktop** | Upload [`unfold.zip`](https://github.com/mahmoud-nasif/Unfold/releases/latest/download/unfold.zip) under **Customize → Skills** |

[docs/install.md](https://github.com/mahmoud-nasif/Unfold/blob/main/docs/install.md) has every agent and the folder each one reads, plus project-level installs and uninstalling.

## Quick start

Open a repository in your agent and ask:

> Map this repo. I'm new here and need to understand it.

The agent scans the repository, reads what matters and writes `page.html`. Open it in any browser; it works offline and has no dependencies. Then:

- **Click** a part to open it, and **Esc** to go back.
- **Hover** a part to trace what flows into and out of it.
- Press **T** for the guided tour, **/** to search, and **E** to edit.

## Features

### A diagram type for each kind of code

| | |
|---|---|
| ![Architecture overview](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/overview.png) **Architecture.** Parts, stores and external systems, and how data moves between them. Every map starts here. | ![Process flowchart](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/process.png) **Process.** What one part does, step by step: steps, decisions, loops. |
| ![Sequence diagram](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/sequence.png) **Sequence.** Who calls whom, in time order: a request lifecycle, a handshake, an action. | ![State machine](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/state.png) **State machine.** Modes and the events that move between them. |
| ![Class diagram](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/class.png) **Class diagram.** Attributes, methods, inheritance, interfaces, composition and aggregation in UML notation. | ![C4 context](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/c4.png) **C4.** People, systems and containers, each labelled with its technology. |
| ![Deployment](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/deployment.png) **Deployment.** Hosts, clusters and containers, grouped by environment. | ![Behaviour tree](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/behaviour.png) **Behaviour tree.** Sequences, selectors, decorators, actions and conditions, children in execution order. |

There are also **data models** (entities, keys and cardinality), **dependency graphs**, **trees and mind maps**, and **timelines**. You can see all of them in the [gallery](https://mahmoud-nasif.github.io/Unfold/types/).

### Grounded in the source

- **Every box cites its code** as `path/file.py:symbol` or a line range. If the map was built from a Git repository, each reference links to those exact lines at the mapped commit.
- **It says how sure it is.** Each part is marked *read* (seen in the code), *peeked* (checked in an excerpt) or *inferred*. Inferred parts are flagged on the canvas.
- **It notices when the code moves.** `unfold.py drift` reports every reference whose file, symbol or line no longer exists, and where a moved symbol went. Run it in CI with the bundled GitHub Action, and a pull request that breaks the map gets a comment.
- **Re-map without losing edits.** After the code changes, the skill re-scans only what changed and merges the result into your edited map. `unfold.py diff` shows what moved between two versions.

### Guided tours, presentation and search

![A guided tour step spotlighting one part of the map](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/tour.png)

- **Tours** lead from inputs to outputs across levels, spotlighting one part per step. The skill writes one for learning and demo maps and can end it with a question the reader answers by clicking a part. Maps without a written tour get a generated one.
- **Presentation mode** (**P**) plays a tour full screen with the controls hidden. **N** opens speaker notes in a second window.
- **Search** (**/**) finds parts by name, by a word in their notes, or by a file path, then opens the level that holds them.

### A real editor

![Editing a map: add shapes, link them, change their style, nest and tidy](https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/docs/images/edit.gif)

- A palette of 19 shapes, including classes, people and servers. Drag a shape onto the canvas, or drop image and video files onto it.
- **Auto-layout and routing.** Long edges get their own lanes, and edges route around the boxes in their way. Each level or edge can use curved, elbow or straight paths.
- **Bend points.** Select a link and drag its handle to reroute it by hand.
- **Linking.** Drag from a node's handle onto another node, or near it, to connect them. You can also press **Link** and click the target.
- **Media in any part.** Attach screenshots, short videos or YouTube and Vimeo embeds, and readers page through them in a viewer.
- **Structure.** Nest a selection into a module with its edges rewired, or expand it again. Group related parts, and change any level's diagram type.
- **Edits are kept** in the browser across reloads. A page published as a claude.ai artifact can save into itself.

### Export and import

| Export | For |
|---|---|
| **PNG, SVG** | The current level, for slides and documents |
| **README embed** | An SVG and a Markdown snippet to paste into your README |
| **PDF** | Every level on its own page |
| **Mermaid** | A Markdown file with one Mermaid block per level |
| **draw.io** | One page per level, linked the same way as the map |
| **Excalidraw** | The current level, with arrows bound to their shapes |

Import works the other way: paste a Mermaid flowchart, sequence, state, class or ER diagram into any level and keep editing it in Unfold.

## How it works

Big repositories don't fit in an agent's context, and reading files whole wastes it. Unfold reads in stages, each more expensive than the last, and stops once every box it plans to draw is backed by code:

| Stage | Tool | What the agent gets |
|---|---|---|
| **Map** | `scan_repo.py` | Languages, layout, manifests and entry points, plus the inputs and outputs with file and line. Inputs and outputs include HTTP routes, message queues and topics, gRPC services, CLI arguments, environment variables, files, databases and hardware interfaces. The map ends with a *read these first* list. |
| **Shape** | `scan_repo.py --outline` | Every class and function with its signature and docstring summary, without bodies. |
| **Evidence** | `peek.py` | Only the lines around the symbols it asks for. |
| **Depth** | full files | Only the few files that hold the core logic. |

The scan and peek commands print their cost in tokens and keep to a budget. Long lists are cut with a note on how to fetch the rest, repeated findings are collapsed, and generated, vendored, minified and git-ignored files are skipped. Re-scans use a cache.

The scanner recognises common frameworks and infrastructure:
- web: Spring, NestJS, FastAPI, Flask, Django, Express, ASP.NET
- messaging and RPC: gRPC, Kafka, RabbitMQ, NATS, Redis
- deployment: Docker, Compose, Kubernetes, Terraform, GitHub Actions
- robotics: ROS 2 topics, services and actions with their message types
- manifests for npm, Python, Cargo, Go, CMake and Make

The agent then writes the map as one JSON document. The validator checks it, and a build step combines it with a self-contained engine into a single HTML page. The schema is documented in [`references/schema.md`](https://github.com/mahmoud-nasif/Unfold/blob/main/skill/unfold/references/schema.md).

## Command line

The scripts need only Python 3.8+ and its standard library, so they also work without an agent and in CI. Install them as a command with `pipx install unfold-map` (then `unfold scan`, `unfold check`, `unfold build`…), or run them from a checkout:

```bash
python skill/unfold/scripts/scan_repo.py REPO [--outline PREFIX] [--section io] [--budget 4000]
python skill/unfold/scripts/peek.py      REPO src/api.py:handle src/db.py:40-80
python skill/unfold/scripts/unfold.py    check   diagram.json
python skill/unfold/scripts/unfold.py    build   diagram.json page.html --repo .   # pin source links to the commit
python skill/unfold/scripts/unfold.py    extract page.html diagram.json            # continue from browser edits
python skill/unfold/scripts/unfold.py    drift   diagram.json --repo .             # exit 1 if the code moved on
python skill/unfold/scripts/unfold.py    diff    old.json new.json --page diff.html
```

To check a map on every pull request:

```yaml
- uses: actions/checkout@v4
- uses: mahmoud-nasif/Unfold/.github/actions/unfold-drift@main
  with:
    diagram: docs/map/diagram.json
    comment: "true"   # post the report on the pull request (needs pull-requests: write)
```

## FAQ

**Does my code leave my machine?** Unfold itself sends nothing anywhere: the scripts run locally and the page works offline. Your agent reads the code the way it would for any other task, so its usual data handling applies.

**Which languages does it understand?** The outline covers Python, JavaScript and TypeScript, Go, Rust, C and C++, and Java. The scanner reads manifests and I/O patterns for the frameworks listed above. For anything else, the agent falls back on reading the code directly.

**Can I use it without an agent?** Yes, though the agent is what writes the map. You can write the JSON by hand or import Mermaid, and use the editor and the command-line tools on their own.

**Will a map from an older version still open?** Yes. Pages from earlier versions open and can be edited.

## Limitations

- The scanner works on patterns. It can miss dynamic wiring, such as dependency injection or topic names built at runtime, and it can report false positives. The agent confirms findings in the code, but review anything marked *inferred*.
- Edges connect parts within one level. A link that crosses levels shows through the parent level's inputs and outputs.
- Routing avoids boxes but not every crossing. On very dense levels, switch to elbow paths, tidy, or bend the busiest links by hand.
- Published claude.ai pages block remote images and may block video embeds. Local media is embedded at build time, so prefer local files.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](https://github.com/mahmoud-nasif/Unfold/blob/main/CONTRIBUTING.md) explains the setup, the test suites (`make test` for unit tests, `make e2e` for browser tests) and how to add a shape, a diagram type or a scanner pattern. Every change comes with a test.

## License

[MIT](https://github.com/mahmoud-nasif/Unfold/blob/main/LICENSE)
