Visuals for HEADSHA

Light theme. Page-only Playwright captures of the real `AgentSetupRequiredCard`, fixture data only: a failed turn on "Grok Build" on this computer (`local_u-alex_dev-mac_grok`), signed out. `window.api` is stubbed. Before is main 9d75be97, after is this branch.

| Before (main): no button | After: Sign in and resend |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/118f99d7c303c0f571db031e110e5fdf233e456a/pr-h/before-grok-card.png" width="480"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/118f99d7c303c0f571db031e110e5fdf233e456a/pr-h/after-grok-card.png" width="480"> |

The outdated-runtime Send reason is a native tooltip, which headless captures don't render. Measured on the same harness Composer with snapshot `{ state: 'idle' }` (no `schemaVersion`):

| | Send disabled | aria-label | title |
| --- | --- | --- | --- |
| Before (main) | yes | "Send" | none |
| After | yes | "Send (Runtime status unavailable — runtime update required)" | "Runtime status unavailable — runtime update required" |
