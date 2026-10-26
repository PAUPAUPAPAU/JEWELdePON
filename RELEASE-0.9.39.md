# 0.9.39 — iPhone browser support

Safe-area padding and small-viewport portrait sizing keep the board and rise button accessible. Coarse-pointer pause controls are 44px, inputs use 16px text, and board long-press selection is suppressed. Track the owning pointer so a second touch cannot replace/release an active drag. Clear held input on blur, resize and backgrounding.

On iOS/iPadOS, one gesture-unlocked AudioContext decodes and caches short effects with at most two loads at a time. Repeated plays stop/disconnect the previous source per effect. Pending sounds are invalidated when stopped. Long BGM stays streamed through GainNodes so game mute and crossfade do not depend on the iOS media volume setter. Next touch resumes suspended audio. Android/desktop retains existing playback. No balance or network protocol changes.

Validation: complete regression suite; simulated 3000 repeated sounds with one active source; decode concurrency/cache, stale cancellation, gains and resume; touch ownership. Chromium fixture explicitly exercises the iOS code path (not an actual Safari test), with 375x667 and 320x568 layouts and no console errors. Local Android/iPhone User-Agent clients share a six-digit lobby, ready/start, bidirectional SSE state/events, and KO result. Verify public HTML and all 22 supplied audio files.

Actual iPhone Safari testing remains required for hardware-specific audio, safe areas, browser chrome, and interruption behavior. Both mobile browsers use the HTML room system. Android app-only four-digit rooms remain separate.

References: https://webkit.org/blog/7929/designing-websites-for-iphone-x/ ; https://webkit.org/blog/6784/new-video-policies-for-ios/ ; https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html
