# From code to levels

How to turn a codebase into levels that answer *what comes in, what happens, what comes out*.

## Contents

- [Finding the boundary](#finding-the-boundary)
- [The overview](#the-overview)
- [Architecture or process?](#architecture-or-process)
- [Drawing a process level](#drawing-a-process-level)
- [Drawing an architecture level](#drawing-an-architecture-level)
- [Sequence, state and data levels](#sequence-state-and-data-levels)
- [Visuals](#visuals)
- [Where to stop](#where-to-stop)
- [Patterns by kind of codebase](#patterns-by-kind-of-codebase)
- [Words](#words)
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

## Before you build

- [ ] The overview has marked inputs and outputs, and data flows from one to the other.
- [ ] Every opened node has a child level with the right type (architecture or process).
- [ ] Process levels start at an input pill and end at output pills.
- [ ] Nodes taken from code have `source`. Anything inferred is listed for the user.
- [ ] `unfold.py check` passes, and each remaining warning is deliberate.
- [ ] The `unfold.py outline` reads like a table of contents for the system.
