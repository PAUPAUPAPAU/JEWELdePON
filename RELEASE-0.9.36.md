# JEWEL de PON 0.9.36

Reduce repeated work during long matches without changing 0.9.35 balance.

- Garbage delivery checks visible capacity first and stops counting ready packets once that capacity is covered. Empty/ineligible queues skip unnecessary busy-state scans. Warning ages, order, total attack power, cancellation and next-clear gates remain unchanged.
- Garbage adjacency directly checks neighboring occupied cells with a bounding-box rejection, avoiding temporary arrays, coordinate strings and Sets for every slab pair.
- Cache the static board background separately for player and opponent. Replace 144 repeated grid strokes per frame with two cached image draws. Only two current surfaces are retained; size or rendering-scale changes rebuild them.
- Skip unchanged HUD text/width writes and idle shake transforms. Physics, input, effects, network cadence, graphics resolution and all game timing remain unchanged.

Validation: full syntax and regression suite passes, including conversion parity, color timing, attacks, CHANGE, ceiling and freeze/flick tests. New differential tests preserve wave state for 16 capacity/attack cases and adjacency for 3,000 sparse slab pairs. With 6-cell packets and 72-cell capacity, ready-packet reads are 12 instead of 100/1,000/10,000. In 600 unchanged frames, selected HUD text writes fall from 2,400 to 4 and repeated grid strokes fall by 86,400 after cache warm-up. These are operation counts, not a measured device FPS guarantee.

HTML: 292754 bytes; SHA256 8c4889f5d82f49dfbaae509c17e73794cc88310ff4027e51b0139411f58b18cc.
Start: node server-0936-wrapper.js. Patch: patch-0936-from-0935.json.
Both players should reload to 0.9.36 and create a new room. Android changes were not made in this task.
