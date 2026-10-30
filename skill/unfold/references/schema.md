# Diagram data schema (v3)

A page renders one JSON document. `scripts/unfold.py check` enforces everything below.

## Contents

- [Top level](#top-level)
- [Level](#level)
- [Node](#node)
- [Shapes](#shapes)
- [Edge](#edge)
- [Group](#group)
- [Colours and icons](#colours-and-icons)
- [Example](#example)
- [Migrating from v1](#migrating-from-v1)
- [Source references](#source-references)
- [Repository and permalinks](#repository-and-permalinks)
- [Diff marks](#diff-marks)
- [Tours](#tours)

## Top level

| Field  | Type   | Required | Meaning |
|--------|--------|----------|---------|
| `meta` | object | yes | `title` (required) is the page heading; `subtitle` is optional, one line. `summary` is one sentence about what the system does, shown in the About card. `glossary` is up to 8 `{"term", "def"}` pairs for project jargon. |
| `root` | Level  | yes | The overview. |

### Generation

`meta.generation` records what the agent session spent on the map, shown in the page's info panel. Write it with `unfold.py usage`, not by hand: it counts the model calls of a Claude Code transcript (each once) or takes numbers you give it.

| Field | Type | Meaning |
|---|---|---|
| `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens` | number | Token counts |
| `cost`, `currency` | number, string | Cost, only when you passed `--cost` or `--rates` (USD per million tokens); Unfold carries no price list |
| `duration_s` | number | Seconds the work took, if given |
| `agent`, `model`, `generated_at`, `note` | string | Who made it, with what, when; a short provenance note |

### Intent and audience

Two optional `meta` fields record what the map was framed for (SKILL.md step 1), so a re-run or an extension of an edited page reuses the framing instead of asking again.

| Field | Type | Meaning |
|---|---|---|
| `meta.intent` | string | One of `learn`, `demonstrate`, `explain`, `review`, `document`, `debug`, `refactor`, `audit`, `plan`, `other`. See `references/intents.md`. |
| `meta.presentStyle` | string | `window`: presenting keeps the overview on screen, dimmed, and opens the part each step explains in a smaller window. Omit for the default, which zooms through the levels. |
| `meta.audience` | string | Free text, one line: who will read the map, e.g. "new backend developers" or "non-technical stakeholders at the quarterly review". |

The engine uses `meta.intent` for its defaults: `demonstrate` opens the page in presentation mode, and `learn` offers the guided tour. Pages without it behave as before.

## Level

The root is a level, and so is every node's `children`.

| Field       | Type    | Meaning |
|-------------|---------|---------|
| `type`      | string  | `architecture` (default): parts and data flow. `process`: steps and decisions in order. `sequence`: interactions over time; nodes are participants left to right, edges are messages in array order. `state`: states and the events between them. `data`: entities with fields and relations. `class`: classes with members and UML relations. `c4`: people, systems and containers with their `tech`. `deployment`: machines and devices (`node3d`) grouped by environment. `dependency`: modules and what they import. `tree`: a hierarchy, children in edge order. `behaviour`: a behaviour tree; nodes carry `bt`, children run in edge order. `timeline`: events in order along an axis, each with a `date`. Trees and timelines get their own layout. |
| `caption`   | string  | One line: what this level is *for*. |
| `direction` | string  | `LR` or `TB`. Leave it out; auto-layout picks the one that fits best. Ignored by `sequence`. |
| `route`     | string  | How this level's edges are drawn: `orthogonal` (default; elbows, always routed around nodes), `curved` (an edge that would cross a node is routed around it) or `straight`. Ignored by `sequence`. |
| `nodes`     | Node[]  | Required. Ids are unique within the level, not globally. |
| `edges`     | Edge[]  | Links between nodes of this level. |
| `groups`    | Group[] | Labelled regions, drawn around their member nodes. |

## Node

| Field      | Type     | Meaning |
|------------|----------|---------|
| `id`       | string   | Required. Short and stable; edges refer to it. |
| `label`    | string   | Required. 2 to 4 words. `\n` forces a line break. Keep code identifiers verbatim. |
| `shape`    | string   | See [Shapes](#shapes). Defaults to `rounded` in architecture levels and `rect` in process levels. |
| `role`     | string   | `input` or `output` *for this level*. Draws a badge and halo, and appears in the legend. |
| `color`    | string   | See [Colours and icons](#colours-and-icons). Defaults to blue. |
| `icon`     | string   | An icon name, or an emoji or 1 to 3 letters. Drawn above the label when the node is at least 88 units tall (not on diamonds or triangles). |
| `source`   | string[] | Where it lives in code: `path/to/file.py`, `file.py:Class.method`, `file.py:42`, `file.py:10-30`, `pkg/module`. See [Source references](#source-references). Shown in the node's detail card. |
| `note`     | string   | 1 to 3 sentences shown when someone clicks the node. |
| `tags`     | string[] | Small badges, any number: `planned`, `deprecated`, `dev only`, `external`, `hardware`, or your own (24 characters at most). `role` is the Input and Output tag. The older single `tag` string is still read and becomes the first of `tags`. |
| `group`    | string   | The id of a group in this level. |
| `text`     | object   | `{"size": "s"/"m"/"l", "bold": true, "italic": true}`. |
| `fields`   | string[] | Rows of a `table` node: `"id: int PK"`, `"order_id: int FK"`. `PK` and `FK` are shown in bold. On a `class` node, its attributes: `"- items: list[Item]"`. |
| `methods`  | string[] | Methods of a `class` node: `"+ total(): Money"`. |
| `stereotype` | string | Shown above a class name, e.g. `interface`, `abstract`. |
| `tech`     | string   | Technology, shown under the label in brackets: `"Python, FastAPI"`, `"PostgreSQL 16"`. Most useful in `c4` and `deployment`. |
| `bt`       | string   | Behaviour tree role: `sequence` (→), `selector` (?), `parallel` (⇉), `decorator` (◇), `action` or `condition` (drawn as a pill). |
| `date`     | string   | Shown on a `timeline` axis: `"2026-10"`, `"v0.4"`. When every node has one, the timeline is ordered by it. |
| `media`    | object or object[] | `{"src", "type", "caption", "poster"}`, or a list of them to attach several screenshots or videos. `src` is a data URI, URL or local path (inlined by `unfold.py build`). `type` is `image`, `video` or `embed` (an iframe, e.g. YouTube); it is inferred if omitted. The node shows a thumbnail badge; a node with media (and no children) opens a viewer when clicked, paging through the list. A `shape: image` node also shows the first item on the canvas. |
| `children` | Level    | The inner diagram. Makes the node zoomable, with a stacked-card cue and a `+` badge. Nest as deep as needed. |
| `x`, `y`   | number   | Centre position. **Omit them** to use auto-layout. Give both or neither; if any node in a level lacks them, the whole level is laid out. |
| `w`, `h`   | number   | Size. Defaults per shape. |
| `confidence` | string | How the node is grounded: `read` (its code was read), `peeked` (the cited lines were seen with `peek`), `inferred` (from names, docs or the user). Optional, but once any node has it, `check` warns about nodes without it. |
| `diff`     | string   | Set by `unfold.py diff --page`: `added`, `removed` or `changed`. See [Diff marks](#diff-marks). Not written by hand. |

## Shapes

| Shape           | Meaning | Typical use |
|-----------------|---------|-------------|
| `rounded`       | Component | Services, modules, packages, nodes (architecture) |
| `rect`          | Process step | One action (process) |
| `pill`          | Start / end | Entry and exit of a process, with an input or output role |
| `diamond`       | Decision | A question with labelled branches |
| `parallelogram` | Data in or out | Requests, messages, datasets, system inputs and outputs |
| `cylinder`      | Store | Database, cache, queue, shared state |
| `document`      | File | Config, report, generated file |
| `hexagon`       | Preparation | Setup, initialisation, loading |
| `cloud`         | External service | Third-party API, cloud system |
| `circle`        | Event | Timer, trigger, interrupt |
| `triangle`      | Marker | Warnings or merge points, rarely needed |
| `text`          | Free text | Annotations on the canvas |
| `table`         | Entity | A data model row set; use with `fields` |
| `image`         | Picture | Shows `media` on the canvas: screenshots, photos, diagrams, video posters |
| `initial`       | Initial state | The filled dot of a state machine; its label is drawn below |
| `final`         | Final state | The ringed dot of a state machine |
| `class`         | Class | Name, attributes (`fields`) and `methods` in compartments |
| `person`        | Person | A user or role in a `c4` level |
| `node3d`        | Server / device | A machine, VM, board or container host in a `deployment` level |

## Edge

| Field   | Type   | Meaning |
|---------|--------|---------|
| `from`  | string | Required. A node id in the same level. |
| `to`    | string | Required. A node id in the same level, other than `from`. |
| `label` | string | What flows, in 1 to 3 words. `yes`/`no` on decision branches. |
| `style` | string | `flow`: data moves along it (default in architecture and process). `solid`: a call, dependency or transition (default in sequence, state and data). `dashed`: optional, fallback, async, loop-back, or a *return* in a sequence. |
| `arrow` | string | `end` (default), `both` or `none` (default in data, tree, behaviour and timeline levels). |
| `rel`   | string | A UML relation, drawn with its own line and end: `inherits` and `implements` (child → parent, hollow triangle), `composition` and `aggregation` (owner → part, filled or hollow diamond at the owner), `association`, `dependency` (open arrow). |
| `route` | string | Overrides the level's `route` for this edge. |
| `fromSide`, `toSide` | string | Pin an end to one of the eight anchors of its box: the side middles `t`, `r`, `b`, `l` or the corners `tr`, `br`, `bl`, `tl`. A corner anchor leaves along the side that faces the other end. Set by the editor; leave out to let routing choose. |
| `labelT` | number | Where the label sits along the link, 0 to 1 (default: the middle). Set by sliding the label in the editor; it always stays on the line. |
| `points` | [x, y][] | Bend points the path passes through, in level coordinates. Set by dragging an edge in the editor; leave it out when writing a diagram, auto-routing does better. Tidy clears them. |
| `diff`  | string | Set by `unfold.py diff --page`: `added`, `removed` or `changed`. |

In a `sequence` level, edge order is time order, and an edge may go from a participant to itself (a self-call).

## Group

| Field   | Type   | Meaning |
|---------|--------|---------|
| `id`    | string | Required. Nodes refer to it with `group`. |
| `label` | string | Shown top-left on the region. |
| `color` | string | Defaults to slate. |

The region is computed from the members' positions. Auto-layout gives each group its own band, so group only nodes that sit close together in the flow.

## Colours and icons

Colours: `blue`, `teal`, `amber`, `rose`, `violet`, `slate`, `neutral`, or a hex value such as `#2B7A4B`. Hex values do not adapt to dark mode, so prefer the names. A sensible default mapping:

| Colour  | Use for |
|---------|---------|
| blue    | The system's own logic |
| teal    | Data and stores |
| amber   | Decisions, hardware, runtime |
| rose    | Interfaces: APIs, UIs, protocols |
| violet  | Intelligence: planning, ML, inference |
| slate   | External things |
| neutral | Annotations |

Inputs and outputs are already highlighted by `role`, so they don't need their own colour.

Icons: `chip server storage database cloud network wifi usb monitor terminal code box layers gear wrench sync bolt rocket flag list file folder chart pulse gauge clock bell alert check shield lock key user message link branch upload download power search eye camera spark target robot arm flask`

## Example

```json
{
  "meta": {"title": "Order service"},
  "root": {
    "type": "architecture",
    "caption": "Orders come in over HTTP and leave as shipments.",
    "nodes": [
      {"id": "req", "label": "POST /orders", "shape": "parallelogram", "role": "input", "source": ["api/routes.py:create_order"]},
      {"id": "svc", "label": "Order service", "icon": "server", "source": ["orders/service.py"],
       "children": {
         "type": "process",
         "caption": "Every order is validated before stock is reserved.",
         "nodes": [
           {"id": "in", "label": "Order received", "shape": "pill", "role": "input"},
           {"id": "ok", "label": "Valid?", "shape": "diamond", "color": "amber"},
           {"id": "reserve", "label": "Reserve stock", "source": ["orders/service.py:reserve"]},
           {"id": "reject", "label": "400 response", "shape": "pill", "role": "output"},
           {"id": "done", "label": "Order accepted", "shape": "pill", "role": "output"}
         ],
         "edges": [
           {"from": "in", "to": "ok"},
           {"from": "ok", "to": "reserve", "label": "yes"},
           {"from": "ok", "to": "reject", "label": "no"},
           {"from": "reserve", "to": "done"}
         ]
       }},
      {"id": "db", "label": "orders DB", "shape": "cylinder", "color": "teal"},
      {"id": "ship", "label": "Shipment event", "shape": "parallelogram", "role": "output"}
    ],
    "edges": [
      {"from": "req", "to": "svc", "label": "OrderRequest"},
      {"from": "svc", "to": "db", "style": "solid", "arrow": "both"},
      {"from": "svc", "to": "ship", "label": "order.created"}
    ]
  }
}
```

## Sequence, state and data examples

```json
{"type": "sequence", "caption": "One order, from request to shipment.",
 "nodes": [{"id": "client", "label": "Client", "shape": "rounded", "icon": "user"},
           {"id": "api", "label": "API"}, {"id": "db", "label": "orders DB", "shape": "cylinder"}],
 "edges": [{"from": "client", "to": "api", "label": "POST /orders"},
           {"from": "api", "to": "db", "label": "INSERT order"},
           {"from": "api", "to": "client", "label": "201 accepted", "style": "dashed"}]}
```

```json
{"type": "state", "nodes": [{"id": "i", "label": "", "shape": "initial"}, {"id": "idle", "label": "Idle"},
  {"id": "busy", "label": "Executing"}, {"id": "f", "label": "Shut down", "shape": "final"}],
 "edges": [{"from": "i", "to": "idle"}, {"from": "idle", "to": "busy", "label": "goal accepted"},
           {"from": "busy", "to": "idle", "label": "done / aborted"}, {"from": "idle", "to": "f", "label": "shutdown"}]}
```

```json
{"type": "data", "nodes": [{"id": "order", "label": "Order", "fields": ["id: int PK", "total: float", "status: str"]},
  {"id": "item", "label": "OrderItem", "fields": ["id: int PK", "order_id: int FK", "sku: str"]}],
 "edges": [{"from": "order", "to": "item", "label": "1..*"}]}
```

## Migrating from v1

v2 data opens unchanged. The engine also opens v1 data: `kind` becomes `color`, rectangle groups become membership, and `stats` and `story` are dropped. `unfold.py check` warns about each v1 field. Remove them to silence the warnings.

## Source references

Each entry in a node's `source` is one of:

| Form | Example | Meaning |
|---|---|---|
| `path` | `orders/service.py`, `orders/` | A file or folder, relative to the scanned repo root. |
| `path:symbol` | `orders/service.py:Service.reserve` | A definition in that file. `Outer.inner` (or `ns::fn`) narrows it; the last part is the name. |
| `path:line` | `orders/service.py:42` | One line. |
| `path:start-end` | `orders/service.py:10-30` | A range of lines. |

Grammar: `^(?P<path>.+?)(?::(?:(?P<a>\d+)(?:-(?P<b>\d+))?|(?P<sym>[A-Za-z_$~][\w$.:~]*)))?$`. Entries that start with a URL scheme (`https://`) are links and are not checked. `unfold.py drift diagram.json --repo REPO` checks every other entry and reports a missing file, a missing symbol, a symbol that moved to another file, or a line past the end of the file.

## Repository and permalinks

`meta.repo` pins the map to the code it was made from, so a viewer can open each source at the exact commit.

| Field | Type | Meaning |
|---|---|---|
| `url` | string | The repository's web address, e.g. `https://github.com/owner/repo`. No credentials. |
| `commit` | string | The full commit hash the map was made from. |
| `root` | string | Optional. The folder inside the repository that `source` paths are relative to, when the scan ran on a subfolder. |

```json
{"meta": {"title": "Order service", "repo": {"url": "https://github.com/acme/shop", "commit": "3f2c9e1d4b5a6978c0d1e2f3a4b5c6d7e8f90123", "root": "services/orders"}}}
```

`unfold.py build diagram.json page.html --repo PATH` fills any missing field from git: `commit` from `HEAD`, `url` from the `origin` remote (ssh and scp-style remotes become `https://host/owner/repo`; credentials and `.git` are dropped), and `root` from the folder's place in the work tree. Fields already present are kept, and the JSON file itself is not changed.

A viewer builds one link per source entry (`permalink()` in `scripts/unfold.py` is the reference implementation):

| Host | Link |
|---|---|
| GitHub and similar | `{url}/blob/{commit}/{root}/{path}#L{a}-L{b}` |
| GitLab (host contains `gitlab`) | `{url}/-/blob/{commit}/{root}/{path}#L{a}-{b}` |
| Local editor | `vscode://file/{absolute path}:{a}` |

Leave out `{root}/` when there is no root, the `-L{b}` (or `-{b}`) part for a single line, and the whole `#L…` anchor for a file, folder or symbol reference.

## Diff marks

`unfold.py diff OLD NEW --page OUT.html` builds NEW with the differences marked, for review:

- `"diff": "added"` on nodes and edges only in NEW, including everything inside an added node;
- `"diff": "removed"` on nodes and edges only in OLD, which are put back into the level they came from;
- `"diff": "changed"` on nodes whose `label`, `shape`, `role`, `source`, `note` or presence of `children` changed, and on edges whose `label`, `style` or `arrow` changed.

Nodes are matched by `id` within the same level path (`svc/worker` is the level inside `worker`, inside `svc`); edges by their `from` and `to`. A level that exists on only one side shows up as a `changed` parent.

## Tours

`meta.tours` is a list of guided walks through the map. The page shows them under **Tour** (and `T`); **Present** (`P`) plays one full screen, with speaker notes in a second window (`N`). With no tours, the page generates one from the map.

```json
"tours": [{"title": "From a request to a response", "steps": [
  {"node": "api", "title": "The API", "text": "Every request enters here."},
  {"path": ["api"], "title": "Inside the API", "text": "Validation comes first.", "notes": "Mention the 400 path."},
  {"title": "Check yourself", "quiz": {"q": "Which part stores orders?", "answer": "db", "explain": "The database owns them."}}
]}]
```

| Step field | Meaning |
|---|---|
| `path` | Node ids to open, from the overview down. `[]` (default) is the overview. |
| `node` | A node in that level to spotlight. |
| `title`, `text` | Shown in the tour bar. One or two sentences. |
| `notes` | Speaker notes, shown only in the notes window. |
| `quiz` | `{"q", "answer", "explain"}`: the reader answers by clicking a node; `answer` is a node id in that level. |

`unfold.py check` resolves every `path`, `node` and `answer`.
