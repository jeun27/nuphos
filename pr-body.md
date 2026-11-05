## Problem

A brand-new member who hasn't connected an agent lands on the home page, types, and presses Enter or the send arrow. Nothing happens. The arrow is gray and the only reason is a hover tooltip ("Choose a runtime to send"). Picking a suggested prompt goes further and hits the "Choose an available runtime" error toast. The one hint on the page is a line of gray text pointing to "User settings › This computer › Local runtime", while the runtime picker says "Settings → Runtimes".

## Change

- **No agent → "Connect your agent" is the send button.** When the team has no active runtime (and the list has loaded without error), the home composer's send button becomes a primary "Connect your agent" button. It opens the existing agent setup (`openAgentSetup`, the same flow #1468 uses after joining). The draft stays in the composer through setup. Suggested prompts (page starter suggestions and sidebar presets) open the same setup instead of the error toast.
- **The local-runtime hint line is gone.** `LocalAgentHint` is deleted and the button replaces it. Its one locale key is removed from all seven catalogs, which `i18n.test.ts` requires.
- **Agent connected, no GitHub → "Connect GitHub".** For team administrators only, since the backend's `install-url` route is ADMINISTRATOR-only. A secondary button sits under the composer, opens the existing `BindGithubDialog`, and goes away once GitHub is connected.
- **No "0" badges.** The credential and computer buttons hide their count while there is nothing to pick.
- `noAgentToRun()` in `runtimeControlSignOut.ts` decides the state, with a unit test. The action rides on `RuntimeControl.onConnectAgent`, so the in-conversation composer is unchanged.

Not changed: Enter with no agent still does nothing (no error). Onboarding itself is untouched.

Follow-ups, not built here:
- Starter suggestions only appear once a cloud account is bound (`hasCloudOnboardingBinding`), so a GitHub-only team gets none.
- Opened from the home, the agent setup still reads "Step 2 of 3".
- `localAgentReady()` in `lib/localAgentReady.ts` now has no caller outside its test.

@yuaanlin, this is a visible change on the home page. Copy and placement are your call.

## Screenshots

Page-only captures of the real renderer with fixture accounts (no backend), light theme. The full set is in the Visuals comment.

| | Before | After |
|---|---|---|
| No agent, typed and pressed Enter | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-before-signup-typed.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-typed.png) |
| Agent connected, admin, no GitHub | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-before-signup-ready-home.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-ready-home.png) |

## Testing

- Desktop suite: 2,678 passed, 3 skipped, 1 failed. The failure is `electron/local-terminal.test.ts`, which can't load node-pty's native module in the Linux sandbox. It is unrelated, and CI runs it.
- `tsc -p tsconfig.app.json --noEmit` passes. Prettier is clean. ESLint shows 0 errors on changed files. `check-import-cycles`: desktop 0 cycles.
- New test: `noAgentToRun` covers no runtimes, disabled, deleting, active, starting, loading, and a failed list.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
