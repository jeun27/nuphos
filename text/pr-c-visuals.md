Visuals for HEADSHA

Light theme. Page-only Playwright captures of the real Desktop `Composer` and runtime picker. Fixture data only: viewer Alex Rivera, a conversation on teammate Taylor Kim's "Taylor’s Mac mini", whose Claude Code is signed out. `window.api` is stubbed and `runtimeSignInAsk` answers `{ askedName: 'Taylor Kim' }`. Before is main 0384809b, after is this branch.

### Banner

| Before (main): no button | After: Ask | After: asked |
| --- | --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/f9c7c4f7a0f593dc93777cdd039e76b4ebdfeacb/pr-c/before-banner.png" width="320"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/f9c7c4f7a0f593dc93777cdd039e76b4ebdfeacb/pr-c/after-banner.png" width="320"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/f9c7c4f7a0f593dc93777cdd039e76b4ebdfeacb/pr-c/after-banner-asked.png" width="320"> |

### Picker

| Before (main): clicking the row does nothing | After: Ask to sign in |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/f9c7c4f7a0f593dc93777cdd039e76b4ebdfeacb/pr-c/before-picker.png" width="480"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/f9c7c4f7a0f593dc93777cdd039e76b4ebdfeacb/pr-c/after-picker.png" width="480"> |

After clicking the row, the request goes out, the menu closes and the banner shows the ask:

<img src="https://raw.githubusercontent.com/jeun27/nuphos/f9c7c4f7a0f593dc93777cdd039e76b4ebdfeacb/pr-c/after-picker-asked.png" width="480">
