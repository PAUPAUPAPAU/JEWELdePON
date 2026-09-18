# JEWEL de PON 0.9.31

- Item chance increases slightly from 25% to 28% per incoming row. Maximum remains one per row and three on the board; initial count stays one.
- New CHANGE item swaps the physical boards: jewels (including special items/pink), garbage and hidden-row panels. FLIP and CHANGE each have 7.5% weight among generated items. Other weights retain their relative proportions within the remaining 85%.
- CHANGE uses a turquoise badge with opposing arrows. Help text explains its effect.
- Current clears, conversion, falling and rising animations finish before exchange; new swaps, clears and garbage insertion wait. Scores, incoming warning queues, next rows and rise clocks stay with their owners. Combos end and top-danger grace restarts after exchange.
- Local CPU matches swap both settled boards together. Online matches use a server transaction: prepare, collect both settled boards, commit, then acknowledge. Duplicate requests while an exchange is pending coalesce into one exchange. Duplicate readiness/commit messages do not repeat the exchange. Status polling recovers missed events; uncommitted exchanges expire after 30 seconds when contacting the server. Older snapshots are rejected by exchange epoch.
- No Android changes and no audio changes.

Validation: syntax checks; 30 automated cases (14 garbage regressions with 117 capacity combinations, 8 balance tests, 8 CHANGE tests). Local HTTP integration exercised two clients, simultaneous requests, readiness barrier, committed-state recovery and stale snapshot rejection. Browser fixture exercised the real clear/animation loop: 12 vs 30 jewels became 30 vs 9 after clearing 3; icon displayed and no console errors. HTTP verification checks exact HTML, health version, two original BGM files and 13 sound effects.

Start command: node server-0931-wrapper.js. New files required: patch-0931-from-0930.json and board-change-0931.cjs, in addition to earlier release files.
HTML: 288860 bytes; SHA256 1205d57a5856e24fbe84ea01649aea5772b226f6be665f9744307d27fea53c72.

Both players must reload to 0.9.31 before creating a new room. Physical-device online play and item balance still benefit from real-play feedback.
