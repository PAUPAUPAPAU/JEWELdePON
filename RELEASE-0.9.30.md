# JEWEL de PON 0.9.30

Expert matches previously stalled: long combos sent only 6 cells every third clear, pending garbage could be cancelled indefinitely, and ordinary falling refilled combo grace.

- Combo grace refreshes to 1.5 seconds only after a real clear. Resolution pauses the remaining time, including the final busy frame, without refilling it. CPU uses the same clock. Global pause shifts observation timestamps to avoid double extension. Special pauses and flips no longer grant extra grace.
- Every combo step from 2 sends an attack: 2–4 = 6 cells; 5–9 = 12; 10–19 = 18; 20+ = 24. Simultaneous-clear bonuses remain. An uninterrupted 50-combo generates 1002 cells before cancellation, versus 114 previously.
- Incoming attacks can be cancelled during their 2.4-second warning. At maturity they become committed; counterattacks can still cancel newer warnings behind them. Committed counts appear in the waiting display.
- Existing garbage wave limits remain: fit only empty top rows, retain surplus as a queue, and wait for resolution then another clear before the next wave. No forced drop during conversion.
- Pink becomes the sixth generated color after 120 seconds. Existing jewels retain their colors. Local, CPU, remote and next-row rendering share a cached six-row atlas; pink reuses the purple animation frames with a pink hue.
- Automatic rise intervals: 0s 8.3s; 30s 7.4s; 60s 6.5s; 90s 5.6s; 120s 4.8s; 180s 4.0s; 240s 3.4s; 300s 2.4s; 360s 1.8s; 420s 1.2s per row. Countdown continues during resolution, but insertion waits for a safe state. Debt is capped at one row.
- Help text documents the new rules. BGM and sound assets are unchanged.

Validation: npm run check; npm test (14 regression cases including 117 capacity combinations, plus 8 balance cases). Browser startup and six-color animation inspected. HTTP verification checks exact reconstructed HTML, health version, two original BGM files and 13 sound effects. Expert-vs-expert balance still needs real-play feedback.

Deployment uses server-0930-wrapper.js, applying patch-0930-from-0929.json after all previous patches. Reconstructed HTML: 281975 bytes, SHA256 64da4768bd770d68ee5ac86d30830ce403eed655aebee7f120ea8b7a3106adcb.

Both players must reload to 0.9.30 before starting a new room. Android work is separate and untouched.
