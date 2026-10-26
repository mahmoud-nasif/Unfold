# From code to levels

How to turn a codebase into levels that answer *what comes in, what happens, what comes out*.

## Contents

- [Finding the boundary](#finding-the-boundary)
- [The overview](#the-overview)
- [Architecture or process?](#architecture-or-process)
- [Drawing a process level](#drawing-a-process-level)
- [Drawing an architecture level](#drawing-an-architecture-level)
- [Sequence, state and data levels](#sequence-state-and-data-levels)
- [Class, C4, deployment and tree levels](#class-c4-deployment-and-tree-levels)
- [Visuals](#visuals)
- [Where to stop](#where-to-stop)
- [Patterns by kind of codebase](#patterns-by-kind-of-codebase)
- [Words](#words)
- [Token budget](#token-budget)
- [Re-mapping](#re-mapping)
- [Before you build](#before-you-build)

## Finding the boundary

Inputs and outputs are what a reader looks for first, so find them before anything else. In the scan, they are the signal sections plus the entry points.

| Inputs (data enters) | Outputs (data leaves or acts) |
|---|---|
| HTTP routes, gRPC/RPC handlers, websocket handlers | Responses, outbound API calls |
| Subscribed topics, consumed queues, service servers | Published topics, produced messages, service clients |
| CLI arguments, config files, environment variables | Files written, reports, exports |
| Files and datasets read | Database writes |
| Sensors, cameras, serial ports, user input | Actuator and motor commands, UI updates |

Configuration is usually an input, but a minor one. Show it only if it shapes behaviour a reader cares about (modes, feature flags), and use a `document` or `parallelogram` node.

Each level has its **own** boundary. Inside a module, the inputs are what crosses into it from the parent level. The editor's Nest action marks them automatically, and you should too.

## The overview

- Put the inputs on the left as `parallelogram` nodes (`role: input`) and the outputs on the right (`role: output`).
- Between them go the 3 to 8 parts that do the work, as `rounded` nodes with an icon. Use whatever the code calls them: packages, services, nodes, apps.
- Draw stores (databases, caches, queues, shared state) as `cylinder` nodes and third-party systems as `cloud` nodes.
- Edges follow the direction of data. Label each with what flows, using the names in the code (`/camera/image`, `JobRequest`, `orders.csv`).
- Group only nodes that sit close together in the flow and share a real boundary: one process, one machine, one team. A group whose members are far apart in the flow stretches across the whole diagram.

## Architecture or process?

For each node you might open, read its code and ask one question:

> **Is the inside several parts that run or exist side by side, or one sequence of steps applied to an input?**

| Signal in the code | Child level |
|---|---|
| Several classes, services or nodes that call or message each other | `architecture` |
| A package whose modules each own a concern | `architecture` |
| A request handler, CLI command or job: validate, then do, then respond | `process` |
| A pipeline: load, transform, write | `process` |
| A control loop or state machine: read sensors, decide, act | `process` (states as steps, transitions as edges) |
| An algorithm with branches | `process` |
| A request, goal or message travelling across several parts | `sequence` |
| An enum of states with transitions, a mode manager, a connection lifecycle | `state` |
| ORM models, schemas, protobuf/ROS messages, DB migrations | `data` |

Mixed cases are common. A service is often an architecture of a few parts, and inside one of those parts is the process. Nest it that way rather than mixing both on one level.

## Drawing a process level

- Start with a `pill` marked `role: input` that names what arrives ("Job request", "Camera frame").
- Draw steps as `rect` nodes, one action each, in the verb form the code uses ("Validate schema", "Detect objects").
- Draw decisions as `diamond` nodes with a short question ("Valid?", "Tool attached?"). Label the outgoing edges `yes`/`no` or with the cases.
- Draw data produced or consumed mid-flow as `parallelogram` nodes; files as `document`; stores as `cylinder`.
- Draw loops as an edge back to an earlier step, with `"style": "dashed"` and a label such as `next` or `retry`.
- End with one or more `pill` nodes marked `role: output` ("Response sent", "Command published"). Errors that leave the flow are outputs too.
- Put the function or method name in `source`, for example `controller.py:Controller.step`.

## Drawing an architecture level

- Use `rounded` nodes with an icon for parts, `cylinder` for stores, `cloud` for external systems.
- Use edge styles to say what kind of link it is: `flow` (default, animated) when data moves; `solid` for a call or dependency with no meaningful payload; `dashed` for optional, fallback, async or rare paths. Use `"arrow": "both"` for request/response pairs drawn as one edge.
- Show the parent's inputs and outputs at the edges of this level too, so the reader stays oriented.

## Sequence, state and data levels

**Sequence.** Use it when the *order of interactions* is the point: how one request moves through the system, how an action goal is negotiated, a handshake.
- Participants are nodes in left-to-right order of first appearance, with the initiator on the left.
- Messages are edges in time order, labelled with the call, route, topic or message name verbatim.
- Draw returns and responses `dashed`, and self-calls as an edge to the same node.
- Keep it to 12 messages or fewer. Find the order with `peek` on the handler chain.

**State.** Use it when behaviour depends on a mode: a state enum, a lifecycle node, a connection or job status, an FSM library.
- Start with an `initial` node; use `pill` states and `final` for terminal states.
- Label edges with the event or guard that causes the transition (`goal accepted`, `timeout`, `error`).

**Data.** Use it when the shape of data explains the system: ORM models, Pydantic or dataclass schemas, protobuf, ROS `.msg`, SQL migrations.
- Each entity is a `table` with its important fields only, at most about 8.
- Keys are marked `PK` or `FK`. Edges carry cardinality (`1..*`, `0..1`).
- The scan lists `.msg`, `.srv`, `.proto` and `.sql` files under Languages, and the outline shows model classes.

## Class, C4, deployment and tree levels

- **Class** (`class`): for an object model or a plugin hierarchy that a newcomer must extend. Take members from `scan_repo.py --outline`: public fields and methods only, with `+`/`-`/`#` visibility. Use `rel` on edges: `inherits` for subclassing, `implements` for interfaces and protocols, `composition` when the owner creates and destroys the part, `aggregation` when it only holds one, `dependency` for "uses it in a method". Keep it to the 5 to 10 classes that matter.
- **C4** (`c4`): when the reader needs the system in its world first: `person` nodes for users and roles, the system's containers with `tech`, external systems as `cloud`. Use groups as the system boundary.
- **Deployment** (`deployment`): from Dockerfiles, compose files, Kubernetes manifests, Terraform and launch files. One `node3d` per host, VM, board or pod, `tech` for its runtime, groups for environments or networks.
- **Dependencies** (`dependency`): from the scan's import graph, for refactors and reviews. Draw importer → imported; leave out the standard library.
- **ROS 2 graph**: stay with `architecture`: nodes as `rounded` with the `robot` or `chip` icon, topics as edge labels (`/camera/image_raw`), services and actions as dashed edges. Use a `sequence` for one action's goal–feedback–result exchange.
- **Behaviour trees** (`behaviour`): from py_trees, BehaviorTree.CPP or Nav2 XML. One node per tree node with `bt`, edges parent → child in the order the children run.
- **Tree** (`tree`) for a config, menu or docs hierarchy; **timeline** (`timeline`) for releases, migrations or a boot sequence, each node with a `date`.

## Visuals

Screenshots, photos of hardware, recorded demos and existing architecture images make a page far easier to follow.
- Look in `docs/`, `assets/`, `media/` and image links in the README.
- Attach them as `media` with a local path.
- Use a `shape: image` node where the picture *is* the part (the UI, the robot cell). Use `media` on a normal node where it illustrates one ("click to see it running").
- Never fabricate an image or caption.

## Where to stop

- Open a node only if its inside has **3 or more** meaningful parts or steps. Otherwise write a `note` with the key fact and its `source`.
- Go deepest where the user said the work or the complexity is. Uneven depth is honest.
- Keep each level to about 12 nodes at most. If you have more, nest a subset (several modules become one area node) instead of shrinking everything.
- External libraries are not opened. They are leaves with a note.

## Patterns by kind of codebase

- **Web service or API:** inputs are routes; parts are handlers, services or domain, persistence, background workers; outputs are responses, events and emails. Inside a handler, the process is validate → authorise → act → persist → respond, with error branches as outputs.
- **ROS 2 robot stack:** inputs are subscribed topics, action goals and service requests; parts are nodes, or packages when there are many; outputs are published topics, action results and hardware commands. Label edges with topic names verbatim. Inside a node: either an architecture of callbacks and timers, or the process of the main callback or action execution, such as goal received → validate → plan → execute → feedback loop → result.
- **Data or ML pipeline:** inputs are datasets and configs; parts are stages; outputs are models, reports and tables. Each stage's inside is a process.
- **CLI tool:** inputs are arguments, files and environment; the main command is a process; subcommands are parts at the top if there are several.
- **Embedded or firmware:** inputs are sensors and interrupts; parts are drivers, the control loop and comms; outputs are actuators and telemetry. The control loop is a process.
- **Frontend app:** inputs are user actions and API data; parts are pages or features, state and the API client; outputs are rendered UI and API calls.
- **Monorepo:** the overview shows packages or services and how they depend on each other. Use the scan's dependency section, then open the important ones.

Typical complete maps:

| Codebase | Overview | Good children |
|---|---|---|
| Web API | clients → API → services → DB/queue/externals | `sequence` for the main request, `process` per handler, `data` for models |
| ROS 2 stack | sensors/topics → nodes → actuators | `sequence` for an action goal, `state` for lifecycle or mode manager, `process` for the main callback, `data` for custom msgs |
| Data/ML pipeline | sources → stages → outputs | `process` per stage, `data` for the dataset schema |
| Frontend app | user → pages/state/API client → backend | `state` for UI flow, `sequence` for a user action round-trip |
| Firmware | sensors/interrupts → control loop → actuators | `state` for modes, `process` for the loop |

## Words

- Labels have 2 to 4 words and no sentences. Keep code identifiers verbatim (`write_health_flag`, `/cmd_vel`, `JobRequest`).
- Edge labels have 1 to 3 words, saying what flows.
- A caption is one line about purpose, e.g. "Every goal is checked for reachability before the arm moves".
- Notes are 1 to 3 sentences, for detail that would clutter the canvas.
- Use the user's language and their team's vocabulary.

## Token budget

The aim is a grounded map for the fewest tokens. Every tool prints its cost on the last line (`≈N tokens`, about 4 characters each), so you can see where the budget goes.

| Step | Default cap | Cheaper still |
|---|---|---|
| `scan_repo.py REPO` | 4000 tokens (`--budget N`, `0` for none) | `--section NAME` for one part: `summary`, `entry`, `io` or `io.http` / `io.env` / …, `readfirst`, `layout`, `manifests`, `imports`, `changed` |
| `scan_repo.py REPO --outline [PREFIX]` | 4000 tokens | one top-level part per call; the cut-off line names the prefixes left |
| `peek.py REPO ref …` | 400 lines or 4000 tokens (`--max`, `--budget`) | `file:symbol` instead of ranges; all refs in one call so windows merge |
| Reading a whole file | about 10 tokens per line | only for the 3 to 8 files with the core logic |

What the scan already does for you:

- **Priority cut.** The summary, entry points, I/O signals and the read-first list are filled first; long lists end with `… N more; rerun with --section X` (or `--outline PREFIX`). Ask for more only when a node needs it.
- **Deduplication.** A signal seen in many places (the same env var in 40 files) is one line with a count and the first locations.
- **Skips.** Vendored and build folders (`node_modules`, `vendor`, `dist`, `target`, `.venv`, …), generated files (`_pb2.py`, `.pb.go`, `@generated` or `DO NOT EDIT` headers), minified bundles, lock files and everything `.gitignore`d (via `git ls-files` in a work tree). The summary counts what was skipped.
- **Cache.** Per-file results are stored under `$XDG_CACHE_HOME/unfold/` (or `$UNFOLD_CACHE_DIR`), keyed by size and modification time, never in the repo. A second scan or an outline after a scan only reads changed files. `--no-cache` turns it off.

How to spend it:

1. README and the Map. Decide the 4 to 10 parts from the layout, imports and signals.
2. Outline only the parts you will open, one `--outline PREFIX` at a time.
3. One `peek` call per part, listing every symbol you will cite. Mark those nodes `"confidence": "peeked"`.
4. Read whole files only where a process level needs the real control flow; mark those nodes `"read"`. Nodes drawn from names, docs or the user's words are `"inferred"`, and you list them to the user.
5. Stop when every node you plan to draw has a `source`. More reading rarely changes the overview.
6. Write `diagram.json` once, then change it with small edits. Review with `unfold.py check` and `unfold.py outline` rather than printing the JSON or the page.

## Re-mapping

A map stays useful only if it follows the code. Keep two files side by side:

- `diagram.generated.json`: exactly what you generated, never edited by hand;
- `diagram.json`: the map people edit (if they edited the page, refresh it with `unfold.py extract page.html diagram.json`).

To re-map:

1. Find what changed: `scan_repo.py REPO --changed-since <meta.repo.commit>` lists changed and deleted files and only their signals. `unfold.py drift diagram.json --repo REPO` lists nodes whose source file, symbol or line no longer matches, and where a moved symbol went.
2. Copy `diagram.generated.json` to `diagram.generated.new.json` and update only the affected nodes. **Keep ids stable**: the same part keeps the same id, so the merge can match it.
3. Merge: `unfold.py merge --base diagram.generated.json --ours diagram.json --theirs diagram.generated.new.json -o diagram.json`.
4. Optionally review: `unfold.py diff diagram.generated.json diagram.generated.new.json --page diff.html` shows added, removed and changed elements.
5. Replace `diagram.generated.json` with the new one, then `unfold.py build diagram.json page.html --repo REPO` to pin the new commit.

The merge decides field by field, per node, edge and group, matched by id (edges by their ends):

- A field a person changed (ours differs from base) is kept; otherwise the new scan's value wins. Positions, labels, notes, media and colours a person set therefore survive.
- Nodes a person deleted stay deleted. Nodes the scan no longer finds are removed, unless a person edited them.
- New nodes are added without positions, so the level is auto-laid out. If a person arranged every node of that level by hand, new nodes go in a column on the right instead.
- When both sides changed the same field, the person's value is kept and the conflict is printed. Tell the user about every conflict.

## Before you build

- [ ] The overview has marked inputs and outputs, and data flows from one to the other.
- [ ] Every opened node has a child level with the right type (architecture or process).
- [ ] Process levels start at an input pill and end at output pills.
- [ ] Nodes taken from code have `source` and `confidence`. Anything inferred is listed for the user.
- [ ] `unfold.py drift diagram.json --repo REPO` reports no drift.
- [ ] `unfold.py check` passes, and each remaining warning is deliberate.
- [ ] The `unfold.py outline` reads like a table of contents for the system.
