# JEWEL de PON 0.9.34

Fix a reproducible frame-loop freeze and flick sound stacking.

- Effect creation uses performance.now(), while rendering receives the earlier requestAnimationFrame timestamp. On a delayed frame, newly created impact/fragment/special effects could get a negative age. Canvas arc() rejects a negative radius, throwing before the next frame is scheduled. Clamp visual effect ages to zero for player and opponent rendering. Reproduced with a 100 ms delayed frame and garbage landing in 0.9.33; fixed version passes delays through 1 second. This is independent of jewel color; the reported device/session has no captured exception to prove its exact trigger.
- A flick threshold of 0.2 cells combined with advancing the anchor by one full cell made the old loop reverse direction repeatedly within a single pointer event. Directional travel now gives one short-flick move, then one move per cell of continued travel, and requires a deliberate reverse movement. Stationary events do not move again. Tap behavior remains unchanged; cancellation clears drag state.
- Reuse one audio instance per effect, throttle duplicate calls within 60 ms, and restart the existing voice rather than cloning unbounded media elements. Swap volume remains 0.24; identical voices cannot stack. Playback failures cannot interrupt gameplay.

Validation: all existing garbage, combo, balance, CHANGE, ceiling and 7-color tests pass. Added delayed-frame rendering tests with Canvas negative-radius validation; actual pointer event tests for flick, tap, reversal, stationary input and edges; 30,000 sound calls with fixed instance count.

Start: node server-0934-wrapper.js. Patch: patch-0934-from-0933.json.
HTML: 291232 bytes; SHA256 331cf5f88f5e2c4d325cc014d63af86a778058b163bde09f0415840ab1a9f916.
Both players should reload to 0.9.34 and start a new room.
