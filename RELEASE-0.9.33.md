# JEWEL de PON 0.9.33

Long matches gain a seventh jewel color: dark gray.

- Start with five colors; pink joins after 120 seconds, dark gray after 240 seconds.
- New rows and garbage conversion use the active palette for both player and CPU. A new match resets to five colors.
- Gray uses the existing jewel sprite with dark grayscale shading and retained highlights across all 18 animation frames.
- Gray matches clear normally, and the online CHANGE item accepts and transfers the seventh color.
- Help text describes both timed color additions.

Validation: syntax checks and all existing garbage, balance, CHANGE and ceiling regression tests pass. New tests cover timing boundaries, random generation, player/CPU rows, gray matches, CHANGE validation and rematch reset. Browser sprite preview confirms the dark gray appearance.

HTML: 290172 bytes; SHA256 468fc8475c9079a02c716efa39d0e1112a33acce65aa061086587f21cb5d73f0.
Start: node server-0933-wrapper.js. New patch: patch-0933-from-0932.json.
Both players should reload to 0.9.33 and create a new room.
