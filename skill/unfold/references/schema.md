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

## Top level

| Field  | Type   | Required | Meaning |
|--------|--------|----------|---------|
| `meta` | object | yes | `title` (required) is the page heading; `subtitle` is optional, one line. `summary` is one sentence about what the system does, shown in the About card. `glossary` is up to 8 `{"term", "def"}` pairs for project jargon. |
| `root` | Level  | yes | The overview. |

## Level

The root is a level, and so is every node's `children`.

| Field       | Type    | Meaning |
|-------------|---------|---------|
| `type`      | string  | `architecture` (default): parts and data flow. `process`: steps and decisions in order. `sequence`: interactions over time; nodes are participants left to right, edges are messages in array order. `state`: states and the events between them. `data`: entities with fields and relations. |
| `caption`   | string  | One line: what this level is *for*. |
| `direction` | string  | `LR` or `TB`. Leave it out; auto-layout picks the one that fits best. Ignored by `sequence`. |
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
| `source`   | string[] | Where it lives in code: `path/to/file.py`, `file.py:Class.method`, `pkg/module`. Shown in the node's detail card. |
| `note`     | string   | 1 to 3 sentences shown when someone clicks the node. |
| `tag`      | string   | A small badge: `planned`, `deprecated`, `dev only`. |
| `group`    | string   | The id of a group in this level. |
| `text`     | object   | `{"size": "s"/"m"/"l", "bold": true, "italic": true}`. |
| `fields`   | string[] | Rows of a `table` node: `"id: int PK"`, `"order_id: int FK"`. `PK` and `FK` are shown in bold. |
| `media`    | object   | `{"src", "type", "caption", "poster"}`. `src` is a data URI, URL or local path (inlined by `unfold.py build`). `type` is `image`, `video` or `embed` (an iframe, e.g. YouTube); it is inferred if omitted. A node with media (and no children) opens a viewer when clicked; a `shape: image` node also shows it on the canvas. |
| `children` | Level    | The inner diagram. Makes the node zoomable, with a stacked-card cue and a `+` badge. Nest as deep as needed. |
| `x`, `y`   | number   | Centre position. **Omit them** to use auto-layout. Give both or neither; if any node in a level lacks them, the whole level is laid out. |
| `w`, `h`   | number   | Size. Defaults per shape. |

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

## Edge

| Field   | Type   | Meaning |
|---------|--------|---------|
| `from`  | string | Required. A node id in the same level. |
| `to`    | string | Required. A node id in the same level, other than `from`. |
| `label` | string | What flows, in 1 to 3 words. `yes`/`no` on decision branches. |
| `style` | string | `flow`: data moves along it (default in architecture and process). `solid`: a call, dependency or transition (default in sequence, state and data). `dashed`: optional, fallback, async, loop-back, or a *return* in a sequence. |
| `arrow` | string | `end` (default), `both` or `none` (default in data levels). |

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
