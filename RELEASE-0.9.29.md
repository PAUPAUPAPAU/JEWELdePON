# JEWEL de PON 0.9.29

Incoming garbage is now delivered in waves sized to the fully empty rows above the highest occupied cell. For example, with four empty rows and 100 cells of pending attack, 24 cells land and 76 remain in the cancellable warning queue. A wave uses only packets whose 2.4-second warning has elapsed.

After a wave, delivery waits for its physics/clear/conversion to finish and for the next successful clear. That clear's counterattack cancels pending garbage before a new wave can land; the new wave also waits for active board resolution to finish. The eight-second forced delivery was removed. Player and CPU use the same capacity and delivery rules. The HUD distinguishes processing, waiting for a clear, and waiting for space.

The receiver freeze was caused by converting garbage above row 0 through grid[r][c], then throwing before the next animation frame was scheduled. Conversion now bounds-checks destinations and preserves row -1 jewels in the existing overflow buffer. Sparse garbage converts only occupied cells. Empty garbage cannot fall forever.

Combo protection runs before and after board updates so a delayed completion frame cannot consume its grace. Garbage falling, unresolved gravity, board flips, and rising are included. Ordinary horizontal swaps alone still do not extend combos. Existing 1500ms grace after activity is preserved.

Validation: node tests/garbage-0929.cjs executes the reconstructed production game in a deterministic simulation with DOM/audio/drawing mocked. Fourteen tests include 117 capacity/attack-size combinations, subsequent clear gating and cancellation, warning maturity, CPU parity, sparse conversions, the old overflow freeze, delayed combo completion, idle expiry, rematch reset, and empty-garbage gravity. Local server checks confirm exact generated HTML, version, both original MP3 hashes, and all 13 sound effects. Browser test play rendered without console errors. Real-phone two-player play remains a useful follow-up.

Both players should reload after deployment. No network protocol or audio asset changes were made.
