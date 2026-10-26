# 0.9.37 — Custom audio

Use the 18 supplied MP3 files unchanged. Clears select combo1 through combo10, capped at 10; movement, garbage conversion/landing, items and rise use their named clips. Play danger once when the local top timer crosses two seconds remaining. Play katta/maketa once on the appropriate result screen, stopping battle music.

Reuse a bounded audio pool, retain duplicate throttling, stop the previous chain clip when its sound changes, and catch playback failures without blocking gameplay. Restart cleans up sounds; result music follows BGM mute and effects follow SFX mute. Preserve 0.9.36 performance work and existing balance. Preserve the app-only four-digit room endpoint added concurrently.

Validation: all gameplay regressions and sound tests pass, including real player/CPU clear selection, warning timing during rescue, result lifecycle, mute and fixed allocation under repeated actions. Verify served HTML and all 18 audio files by SHA-256 against the original files.
