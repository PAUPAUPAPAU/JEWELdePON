# JEWEL de PON 0.9.35

- Garbage conversion runs at 1.5x speed: initial lead, per-cell gap and seven crack frames are all divided by 1.5. A 24-cell slab now completes in about 3.12 seconds instead of 4.69 seconds.
- CPU conversion previously began immediately and processed one cell per update with an unscaled 185 ms delay. It now shares the player's lead, timing function, crack stages, order and completion criteria, catches up all due cells after delayed frames, and shifts the same start clock on pause. CPU crack rendering now displays its actual stage. Online opponents already execute the same player code on their respective clients; updating both clients is required.
- Simultaneous clears now attack for 4 cells at four matched jewels, 5 at five, and 6 at six or more. Previously those amounts were 3, 4 and 5 (six jewels), capped at 6. Existing per-chain attacks add to these amounts. Warning cancellation still applies equally, so an attack can be fully countered.
- Help text explains conversion speed and simultaneous-clear attacks.

Validation: existing garbage capacity, conversion, combo, attack, CHANGE, ceiling, seventh-color and freeze/flick regressions pass. New tests compare every conversion completion boundary for 1,4,5,6,19,24,72 cells on both boards, pause and delayed-frame catch-up, real four/five/six-jewel clears, and online attack payloads including cancellation and chain bonuses.

HTML: 291848 bytes; SHA256 5540c60581d1e55a061062e5b6e6a9edb731d1f64ebdb46343c6458df36f9e4d.
Start: node server-0935-wrapper.js. Patch: patch-0935-from-0934.json.
Both players should reload to 0.9.35 and create a new room.
