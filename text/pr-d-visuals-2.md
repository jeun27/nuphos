Visuals for HEADSHA

The full set again after rebasing onto main 45122135 (#1585 merged). `git range-diff OLDHEAD...HEADSHA`: the only change is the import line in `ReadOnlyNotice.tsx`, merged with #1585's `useAskedName` import. Nothing visible changed; everything below was re-captured at this head.

Light theme. Page-only Playwright captures of the real Desktop `Composer`. Fixture data only: conversation `s-1` on "Build agent", which is no longer in the runtime list (`unavailable: true`). `window.api` is stubbed. Before is main 45122135, after is this branch.

| Before (main): no banner | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/6b944348a54e5e1c9cafaee8400c72d0e311c921/pr-d-2/before.png" width="480"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/6b944348a54e5e1c9cafaee8400c72d0e311c921/pr-d-2/after.png" width="480"> |

### With a message typed

| Before (main): Send enabled, so the message hits runtime_not_found | After: Send disabled |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/6b944348a54e5e1c9cafaee8400c72d0e311c921/pr-d-2/before-typed.png" width="480"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/6b944348a54e5e1c9cafaee8400c72d0e311c921/pr-d-2/after-typed.png" width="480"> |

### After: Switch runtime opens the picker

<img src="https://raw.githubusercontent.com/jeun27/nuphos/6b944348a54e5e1c9cafaee8400c72d0e311c921/pr-d-2/after-switch.png" width="480">
