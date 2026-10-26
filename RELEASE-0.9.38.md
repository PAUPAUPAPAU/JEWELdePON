# 0.9.38 — Additional sounds and GO display

- Play gameover once when the local player loses; retain result music.
- FLIP activation and completed CHANGE use banmen. Other items retain item. Incoming online FLIP also plays banmen.
- Play 321 once at each countdown digit using one shared reusable player; stop it at GO.
- Play go and show GO！！ on both boards for 800ms at match start, without delaying simulation or input.
- Preserve all balance, performance, existing audio and app-room behavior.

Validation: full regression suite, sound event tests, shared countdown allocation, one-shot death, GO rendering/expiry, item distinction, and byte-exact audio delivery.
