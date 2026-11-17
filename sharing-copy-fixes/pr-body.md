## Summary

Part of #3197 (piece 4 of the split: copy-only fixes). Fixes #ISSUE.

The copy around sharing a computer was written before #730, #1391 and #2431 and never caught up, and the shared confirm dialog labels every destructive action "Delete".

- **Settings lines.** Local runtime, both agent cards (Claude Code, Codex) and Local exec said only your own agents can use this computer. Teammates you share it with run on its agents with your sign-in, and those who manage it can use local exec. The three lines now say so.
- **`docs/shared-computers.md`.** Says what Use and Manage grant since #2431: Use = conversations on the computer's agents (its sign-in, its plan usage, its OS account); Manage adds local exec, file upload, browser/computer control, terminal (unless a cloud computer's owner allows it for Use), agent sign-in and access. It also says that inviting someone to a chat on a computer they cannot use asks to give them Use of the whole computer, and that removing them from the chat does not take that back.
- **"No longer available".** For an agent on someone's computer (`local_` runtime id), the composer banner now reads "{name} is no longer available. It was removed, or its computer is no longer shared with you." The backend `runtime_not_found` refusal (`runtimeGone()`) gets the same addition. Removal and lost access still read the same, so the message does not reveal that a computer still exists. The banner's text was a one-line `truncate`, which would cut off exactly the new part in a narrow pane; it now wraps and the tab grows upward.
- **Destructive confirms name the action.** `ContextMenu` used `t('Delete')` for every destructive confirm button. It now uses the action's own label, or a new `confirmLabel` option. "Cancel invite" confirms with "Withdraw invite", so it is not "Cancel invite" next to the dialog's own "Cancel". Kubernetes delete items build their label without `t()`, so they pass `confirmLabel: t('Delete')` and keep a translated button. Non-destructive confirms still say "Confirm".
- **Remove from team / Leave workspace** confirms now say what else goes: the team's chats (on removal), sharing of the person's computers (teammates' chats on them stop), their cloud computers in the team (to the team owner), and what they have open on teammates' computers (on removal). This is what `revokeTeamMemberAccess` on main already does on both paths.

Every new or reworded string carries its 7 translations; the 5 strings it replaces are removed from the locale files.

Compatibility: released phone apps read this refusal by error code, not by its text. iOS maps `runtime_not_found` to its own localized string (`AgentChatAPI.swift`, `case "runtime_not_found": return .runtimeNotFound`) and Android to `R.string.convtext_runtime_not_found` (`AgentChatApi.kt`, `RUNTIME_BLOCKED`). Neither shows the server's message for this code. The code and status (404) are unchanged.

## How this was verified

- **Flow exercised:** the real components rendered in a Vite page harness with fixture data (Maya Chen, example.com), before (origin/main) and after (this branch), same viewport (1100x720 at 2x, light theme, English): Members > right-click Leo Park > Remove from team; Members > right-click the pending invite > Cancel invite; User settings > Local runtime and Local exec; Workspace settings > Danger zone > Leave; the composer status tab for a chat whose `local_` agent is unavailable, in a 420px-wide pane. The harness renders components only: no backend, no Electron, and the "Message…" box under the banner stands in for the composer.
- **Build and environment:** Linux container, headless Chromium through playwright-core, Vite dev server per tree. Fonts fall back to DejaVu Sans on both sides.
- **Result:**

  Remove from team: before "Delete" and one line, after the button is "Remove from team" and the text says what else goes.

  https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/before/03-remove-member-confirm.png https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/after/03-remove-member-confirm.png

  Cancel invite: before "Delete", after "Withdraw invite".

  https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/before/04-cancel-invite-confirm.png https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/after/04-cancel-invite-confirm.png

  Local runtime (section line and both agent cards):

  https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/before/10-local-runtime-copy.png https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/after/10-local-runtime-copy.png

  Local exec:

  https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/before/11-local-exec-copy.png https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/after/11-local-exec-copy.png

  Leave workspace:

  https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/before/12-leave-workspace-confirm.png https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/after/12-leave-workspace-confirm.png

  The "no longer available" banner in a narrow pane: before cut off after "is…", after the whole reason wraps and the tab grows upward, never under the input.

  https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/before/14-agent-gone-banner.png https://raw.githubusercontent.com/jeun27/nuphos/5f9501481e9a1fa6d37885701c045715f6a80ab2/sharing-copy-fixes/after/14-agent-gone-banner.png

- **Automated test added or updated:**
  - `apps/desktop/src/components/agent/panel/runtimeControlSignOut.test.ts`: new test "an agent gone from someone's computer says the computer may no longer be shared". On origin/main's `runtimeControlSignOut.ts` it fails: `expected: '… is no longer available. It was removed, or its computer is no longer shared with you.'`, `actual: 'Claude Code in Maya's Mac is no longer available.'` (`# pass 9`, `# fail 1`). With the fix: `# pass 10`, `# fail 0`.
  - `apps/desktop/src/components/ContextMenu.test.tsx` (new, added to `test:ui`): on origin/main's `ContextMenu.tsx` it fails with `+ 'Delete'` / `- 'Remove from team'`. With the fix: 1 pass, 0 fail.
  - `apps/desktop/src/views/members/useMemberActions.test.tsx` (new, added to `test:ui`): the Cancel invite item confirms with "Withdraw invite", and the Remove from team text says what else goes. On origin/main's `useMemberActions.tsx` both fail (`- 'Withdraw invite'`; `Input: 'Remove Leo from this team?'`). With the fix: 2 pass, 0 fail.
  - Also run: `i18n.test.ts` (5 pass) and `sourceText.test.ts` (3 pass); backend `local-runtime-catalog.test.ts` (21 pass), `thread-undelivered.test.ts` (16 pass), `session-queue-turn.test.ts` (27 pass); backend `bun run typecheck` and Desktop `npx tsc -b --noEmit` clean; eslint 0 errors on every touched file (only existing warnings); prettier clean.
- **Not verified:**
  - Not run in the packaged Desktop app or against a real backend. The captures are the component harness only; I did not trigger a real `runtime_not_found` by unsharing a computer, did not remove a real member or leave a real workspace, and did not open a Kubernetes delete confirm (its `confirmLabel: t('Delete')` is covered by reading the code, not by a test or a capture).
  - The backend message change has no test of its own; I checked by reading that the phone apps key off the code. Not checked on a device.
  - The real-backend e2e suite was not run; this piece changes no access rule.
  - Non-English layouts were not captured.

Refs #3197

🤖 Generated with [Claude Code](https://claude.com/claude-code)
