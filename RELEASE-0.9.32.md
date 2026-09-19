# JEWEL de PON 0.9.32

Fix hidden accumulation after garbage reaches the ceiling and the board rises.

- Both player and CPU stop BEFORE lifting any occupied top-row cell above the visible 12-row board. The commit guard, automatic start, manual start, held/queued manual rise and in-progress animation all respect the visible ceiling. Previously the player checked only existing overflow, and CPU rise failed to check garbage overflow.
- Incoming garbage is limited to whole empty top rows. Its logical position is placed inside that capacity before gravity; only the entrance animation starts above the board. Surplus remains queued for the next eligible clear, retaining the existing wave policy.
- Danger now starts at the visible top row instead of a hidden thirteenth row. The existing 7-second grace resets when that row is cleared; clearing/conversion pauses the countdown. Audio, remote danger state and help text use the same visible ceiling.
- Empty edge rows on sparse garbage are trimmed before rising/flipping, preserving occupied cells and avoiding off-board bounding boxes after transforms.
- Existing item frequencies, CHANGE, attacks, six-color timing and audio assets remain unchanged.

Validation: npm run check; npm test (38 cases, including 117 garbage capacity combinations). Ceiling cases cover repeated rise at a full board, ceiling garbage with no top-row jewels, one remaining row, animation cancellation, 100 incoming -> 6 physical + 94 queued, danger reset, rescue pause, timeout and sparse garbage/FLIP. Local HTTP checks verify exact HTML, version, BGM and effects; two-client CHANGE integration passes.

HTML: 289592 bytes; SHA256 feebd9dd8f50ec14b30827df4382febe2ad481aad09520271f7b0a3c9ea078ab.
Start: node server-0932-wrapper.js. New patch: patch-0932-from-0931.json.
Both players must reload to 0.9.32 and create a new room; existing old-version matches do not hot-update.
