## Summary

Part of #3197 (piece 7 of the split: new UI). Fixes #ISSUE.

NEEDS MAINTAINER VISUAL APPROVAL: all three parts are new UI.

Three small parts, each under its own heading so they can be reviewed, or split off, separately. The files they share are listed at the end.

### 1. Share button on each computer row

Sharing is the usual reason to open a computer's "⋯" menu, but the row had no button for it. A "Share" button now sits next to the menu, only for people who manage the computer (owners and managers; hidden for Use only). It opens the same dialog as "Manage access…", which stays in the menu.

- `views/settings/BoxRow.tsx`, `BoxParts.tsx`: the new `ShareButton`. `ResumeButton` moved out of `BoxRow.tsx` into `BoxParts.tsx` unchanged, to keep `BoxRow.tsx` under the 300-line limit.
- `BoxRow.test.tsx` (new, added to `test:ui`).

### 2. Access history in both Share dialogs

The backend records every change to who may use or manage a computer (`GET /agent/devices/:id/access-audit`), but nothing in the app showed it. Both dialogs (`LocalAgentShareDialog` for a local computer, `BoxAccessDialog` for a cloud computer) now have a collapsed "Access history" section. It loads only when opened, pages with "Show older", and shows each change as who, when, how ("when inviting them to a chat", "they left the team", "removed from the team", "when moving a chat here"; nothing for the dialog itself) and one line per change ("Leo Park can now manage it", "Sara Ortiz can now use it", "Shared with everyone in the team", ...).

- `views/settings/AccessHistory.tsx`, `accessChanges.ts` (turns a previous/next grant into lines), `api/device-access-types.ts`.
- IPC `box:accessHistory`: `electron/atlas/local-share.ts` (`getDeviceAccessHistory`), `electron/main/channels-box.ts`, `electron/preload-parts/api-device.ts`, `src/api/device-api.ts`, `src/api/window-device.ts`.
- "Can use" is worked out as the backend's `deviceAccess` does: managers count as users, and no one is said to gain or lose Use while everyone in the team has it. A Manage grant reads as one line, not "can now manage it" and "can now use it".
- Backend: the access-audit route now returns the entry's `owner` (`{ from, to }` or `null`). `transferTeamComputers` already writes it when a removed member's cloud computer passes to the team owner, but the route dropped it, so that entry read "No change to who can use it". It now reads "{name} now owns it". `routes-devices-access-audit.ts` and its test.
- Names come from the team member list, read when the dialog opens; someone no longer in the team shows as "A former member".
- `via` values: the Desktop type also lists `conversation_remove` ("after removing them from a chat"). The backend writes that value only once the chat-participants piece of #3197 lands; until then it never appears, and the label is ready for it. A value the app does not know gets no label (the `switch` has no default, so the line just shows who and when).

### 3. "Computer shared with you" notices

When a teammate shared a computer with someone, or made them a manager of one, nothing told them. Now:

- `views/settings/computerAccessNotice.ts` (pure, tested) compares the device list with what was last seen. The very first look is remembered, not announced. Use becoming Manage is news; Manage stepped down to Use is not. Losing access and getting it back is news again. Your own computers are never announced. On the first look, a starting list is saved for each of your other teams, so a team first opened later announces only what was shared after that.
- `views/settings/useComputerAccessNotices.ts`, mounted in `WorkspaceSidebarPanel.tsx`: reads `boxListDevices` every 60 s for the current team and keeps what was seen in localStorage per person and team (`nuphos.computerAccessSeen.<viewer>.<team>`). The notice names no one: the device list does not say who made the change (the owner or one of its managers), and the access audit that does is readable only by managers, so it reads "{computer} is now shared with you" or "You can now manage {computer}". If the call to main fails, that computer is taken off the saved list, so the next look announces it again.
- Main process (`electron/agent/notify.ts`, `notifyComputerShared`, IPC `computers:notifyShared`): one announcement per viewer, team, computer and level for 5 minutes (every window finds the same change), remembering at most the latest 500 like `announcedMentions`. A key over 256 characters is refused; the title is cut to 200 characters and the body to 400, so the renderer cannot raise an arbitrary system notification. If the asking window is focused it answers `in-app` and that window shows a toast with "Open"; otherwise it shows a system notification. Clicking it opens Computers in the notice's team, switching back to the account it was raised for first if needed (same handling as `notifyAgentStopped`). `notify.test.ts` is new. The `notify.ts` imports gained their `.ts` suffix so the test can mock them.
- Limits: Desktop only (no Inbox row, no phone push). The notice comes the next time the app reads the list: within a minute while open, or at the next launch. Other teams are not polled; their news comes when that team is next opened.

**Depends on #3210 (whichever merges second adds this):** in the full change, a new notice also invalidates the `managedComputers` query, so someone just made a manager gets the Sign in button without waiting for that query's own refresh. That query (`hooks/useManagedComputers.ts`, `queryKeys.managedComputers`) belongs to #3210, which is still open, so this PR leaves the one invalidation out. Whichever of the two merges second should add, in `useComputerAccessNotices.ts`, after the seen-list is written: `if (notices.length) void queries.invalidateQueries({ queryKey: queryKeys.managedComputers(teamId) })` (with `const queries = useQueryClient()`).

### Files the three parts share

- `apps/desktop/package.json`: one line, `test:ui` gains `BoxRow.test.tsx` (part 1) and `AccessHistory.test.tsx` (part 2).
- `electron/main/channels-box.ts`, `electron/preload-parts/api-device.ts`, `src/api/device-api.ts`, `src/api/window-device.ts`: separate hunks, `box:accessHistory` (part 2) and `computers:notifyShared` (part 3).
- The 7 locale files: separate keys, 19 for part 2 and 4 for part 3 ("{computer} is now shared with you", "You can now manage {computer}" and the two body lines). Part 1 adds no string ("Share" already exists).

## How this was verified

- **Flow exercised:** the real components rendered in a Vite page harness with fixture data (Maya Chen, example.com), before (origin/main) and after (this branch), same viewport (1100x720 at 2x, light theme, English). Computers page with Maya's Mac (local, owner), Maya's Box (cloud, owner) and Leo's ThinkPad (shared with Maya, Use only). Each Share dialog opened the same way on both sides (⋯ > Manage access…), then Access history opened. For the toast, the real `useComputerAccessNotices` hook runs over the real Computers page and the real `ToastProvider`, with a saved seen-list that did not have Leo's ThinkPad yet; the only stand-in is the IPC answer `in-app`, which main gives when the asking window is focused. The harness has no backend and no Electron.
- **Build and environment:** Linux container, headless Chromium through playwright-core, a Vite dev server per tree. Fonts fall back to DejaVu Sans on both sides.
- **Result:**

  Computers: after, a "Share" button on Maya's Mac and Maya's Box, none on Leo's ThinkPad (Use only).

  https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/before/05-computers-share-button.png https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/after/05-computers-share-button.png

  Share dialog of the local computer, Access history opened: a chat invite, a Manage grant (one line), and a removed member's access.

  https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/before/06-share-local-access-history.png https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/after/06-share-local-access-history.png

  "Who can use" dialog of the cloud computer, Access history opened. The newest entry is the Box passing from a removed member to Maya: "removed from the team / Maya Chen now owns it".

  https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/before/07-share-cloud-access-history.png https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/after/07-share-cloud-access-history.png

  The in-app notice: before nothing; after "Leo's ThinkPad is now shared with you / Your agents can run on it now. Pick it when you start a chat." with Open.

  https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/before/08-computer-shared-toast.png https://raw.githubusercontent.com/jeun27/nuphos/bb2c8ef41ebc832f716e6151df891f7b1b1e495b/computer-sharing-ui/after/08-computer-shared-toast.png

- **Automated test added or updated:**
  - `views/settings/BoxRow.test.tsx` (new, in `test:ui`): 2 pass. Without the `ShareButton` line in `BoxRow.tsx` it fails: `(fail) someone who manages a computer shares it from its row in one click`, 1 pass, 1 fail.
  - `views/settings/AccessHistory.test.tsx` (new, in `test:ui`): 1 pass.
  - `views/settings/accessChanges.test.ts` (new): 6 pass. `views/settings/computerAccessNotice.test.ts` (new): 10 pass, including that the notice names no one and that a computer taken off the saved list is announced again. `electron/agent/notify.test.ts` (new): 4 pass (only a focused asking window gets `in-app`, behind another window it notifies, the dedupe key includes the viewer; a click opens the notice's team as the account it was raised for; an over-long title and body are cut and an over-long key refused; only the latest 500 keys are kept). Without the caps and the bound in `notify.ts`, the last two fail (`expected: 200, actual: 5000`; `expected: 'in-app', actual: 'duplicate'`). `electron/main/channels-box.test.ts`: 6 pass.
  - Backend `routes-devices-access-audit.test.ts`: 5 pass. On origin/main's route, 2 fail (`a computer passed to a new owner says from whom to whom`, and the existing paging test, which now expects `owner: null`).
  - `i18n.test.ts` 5 pass, `sourceText.test.ts` 3 pass. Backend `bun run typecheck` clean; Desktop `npx tsc -b --noEmit` clean apart from the missing `undici` noted below. ESLint 0 errors on every touched file (warnings only, the same as in the reviewed change). Prettier clean.
  - The new `.test.ts` files run in CI through the Desktop `test` script: `"test": "node --experimental-strip-types --experimental-test-module-mocks --test \"electron/**/*.test.ts\" \"src/**/*.test.ts\" \"local-runtime/*.test.mjs\""`. The two `.test.tsx` files are in `test:ui`.
  - e2e: new scenario "a computer a teammate shares with you is announced once, in the app" (`scripts/e2e/share-notice-scenarios.ts`, registered in `computerScenarios`). A second person signs in and joins the team, connects a stand-in computer with their own sign-in (`startSecondComputer`), and shares it with the app's user. The hook's next look is triggered with a `visibilitychange` event, which it already listens to ("loads again when the window shows again"), instead of waiting a minute. The scenario waits for "Teammate laptop is now shared with you", saves `computer-shared-toast.png`, looks again and checks that no second notice appears, then stops sharing and stops the computer. ESLint (root config) is clean on it. I have not run it: the "Desktop against a real backend" job runs it on this PR. No other scenario opens the Computers page's Share button or a Share dialog.
- **Not verified:**
  - Not run in the packaged Desktop app or against a real backend. No real computer was shared, no real member removed, and the access history was not read from a real audit log; the captures are fixture data in the component harness.
  - The system notification (window not focused), its click opening Computers, and the switch back to the right account cannot be captured in a headless page. They are covered only by `notify.test.ts` with Electron mocked.
  - Two windows open at once, and the 5-minute dedupe across them, were not tried.
  - The new e2e scenario was not run here. It expects the app window to be focused under Playwright, so main answers `in-app`; if it is not, main raises a system notification instead and the scenario fails on the missing toast.
  - Desktop `npx tsc -b --noEmit` was run on the latest main with a dependency tree that lacks `undici` (added by #3348): its only 2 errors are `Cannot find module 'undici'` in `electron/backend-socket.ts`, which this PR does not touch.
  - Non-English layouts were not captured.

Refs #3197

🤖 Generated with [Claude Code](https://claude.com/claude-code)
