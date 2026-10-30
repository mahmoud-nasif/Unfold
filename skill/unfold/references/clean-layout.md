# What a clean diagram is

A diagram is clean when a newcomer can follow it without help. These rules are the standard. The engine enforces the ones that are geometry; `unfold.py check` warns about the ones that are structure; the rest are yours to follow when you write or arrange a level.

Aim for the *aim* figures. The check only warns past the *limit*.

## Structure (what you write)

1. **One question per level.** A level answers one thing: what goes in, what happens, what comes out. If it needs two answers, nest one of them.
2. **Size.** Aim for 12 nodes or fewer in a level. Limit: 16. Past that, nest related parts into one node that opens into its own level.
3. **Groups.** A group is one responsibility, 8 nodes at most. A group that needs a longer name than its members is two groups.
4. **Links per node.** Aim for 5 or fewer. Limit: 7. A node with more is a hub: group what it talks to, or split it.
5. **Inputs and outputs.** Every flow level marks where data enters (`role: input`) and leaves (`role: output`). Inputs sit first, outputs last.
6. **Words.** Node labels are nouns of 1 to 4 words. Edge labels say what flows, in 1 to 3 words (limit 28 characters). A label that is a sentence belongs in `note`.

## Arrangement (what the engine does, and what to keep when you edit)

7. **One reading direction.** Flow runs left to right (or top to bottom) and never doubles back, except for a deliberate loop, which is drawn on the outside.
8. **A spine.** The main path is one straight row or column. Side paths hang off it.
9. **Alignment.** Nodes that belong to the same step share a row or column, and sit on the 10 px grid. Gaps between neighbours are equal.
10. **Links are elbows.** Horizontal and vertical runs only. A link never passes through a box it does not connect, and links with no node in common never run on top of each other.
11. **Eight anchors.** A link starts and ends on one of the eight anchors of a box (the middle of each side, or a corner). Links that share an end share its anchor and travel together as one trunk, branching close to their targets.
12. **An anchor points where the arrow goes.** The arrow always arrives at an anchor facing the way the link arrives; moving an end to another anchor turns the arrow with it.
13. **Few crossings.** Place nodes so links cross as rarely as possible. A crossing is acceptable; a link running on top of another one is not.
14. **Labels stay clear.** A label sits on its own link, not on a box and not on another label.

## When a diagram still looks wrong

Try these in order, and stop when it is clean:

1. Move the node with the most crossings next to the nodes it links to.
2. Pin the two ends of the worst link to other anchors (**Ends** in the link toolbar).
3. Nest a cluster of nodes into one node.
4. Split the level in two.

Do not fix a crowded level with curved or straight paths; that hides the problem.
