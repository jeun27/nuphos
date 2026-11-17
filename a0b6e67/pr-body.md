## Summary

Fixes from a click-through of the three ways to share in Nuphos (a computer, a chat, a workspace), plus the review that followed. Each item is something a person hit: a line that was no longer true, a step with no feedback, or an action that did more or less than it said.

### Sharing a computer
- Settings said only you can use this computer's Claude Code or Codex. Since #730 and #1391 a teammate with Use runs on it too, so the three lines now say so. The Local exec line and `docs/shared-computers.md` match #2431: Use is running conversations on the computer's agents, Manage adds local exec, upload, browser control, terminals, agent sign-in and access.
- A **Share** button on each computer row, shown to people who manage it. The menu item stays.
- Teammates are told when a computer is shared with them or they are made its manager: a toast in the window in use, a system notification otherwise. Nothing told them before.
- Managers get the Sign in dialog. The app sent them to the owner although #2431 lets managers sign agents in. "Ask to sign in" now reaches managers as well as the owner.
- Both Share dialogs get an **Access history** section from the existing access audit: who changed access, when, how, and a change of owner.
- Losing access to an agent on someone's computer now says "It was removed, or its computer is no longer shared with you." The banner wraps, so the reason is not cut off in a narrow pane.
- The dead "Requests to use your computer" Inbox section, its badge and its notification are removed. Nothing creates share approvals since #1391. The iOS and Android apps drop their waiting strip and polling for the same reason. The backend approval routes stay for released apps (step 3 of #1328).

### Sharing a chat
- Inviting someone to a chat on a computer they cannot use names the computer and says what Use allows, with an "Add and share" button.
- Removing someone from a chat offers to stop sharing the computer with them (new `POST …/participants/:userId/stop-computer-use`, for a chat owner who manages that computer). Undo of an invite takes back the computer use that invite gave, and keeps the people it could not undo so it can be retried.

### Sharing a workspace
- Invites choose **Editor, Viewer or Admin** (Editor when a client does not say). Pending rows show the role. An Admin invitation gives Admin only while its inviter is still an admin of the team, Editor otherwise.
- Pending invites can be **resent** (admins, at most every 5 minutes, counted from an email that actually went out) and their link copied. The app says "Invited, but no email went out" instead of always "Invitation sent".
- "Remove from team" and "Leave workspace" say what else goes: shared computers, cloud computers passing to the team owner, open agents.
- Destructive confirm buttons name the action instead of "Delete". Cancel invite uses "Withdraw invite", so it cannot be confused with the dialog's own Cancel.
- Changing a member's role no longer closes their open streams on team computers, a leftover from before #1391 when admins had implicit access.

### Compatibility
- Released Desktop and phone apps keep working: every response change is an added field, the phone apps read `runtime_not_found` by code, and invitations created before this change join as Editor.
- A new Desktop on an older backend says when the server ignored the chosen role, and does not show a false "Failed to undo".

## How this was verified

Page-only captures of the real components in a Vite harness with fixture data (light theme, same viewport per pair), taken at `a0b6e6704` against base `282f164f0`.

**Invite window: the new "Joins as" picker**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/01-invite-role-picker.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/01-invite-role-picker.png" width="440"> |

**Pending invite: its role, and Resend email / Copy invite link**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/02-pending-invite-menu.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/02-pending-invite-menu.png" width="440"> |

**"Remove from team" says what goes with the person, and the button names the action**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/03-remove-member-confirm.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/03-remove-member-confirm.png" width="440"> |

**Cancel invite confirms with "Withdraw invite", not "Delete"**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/04-cancel-invite-confirm.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/04-cancel-invite-confirm.png" width="440"> |

**Share button on computers the viewer manages**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/05-computers-share-button.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/05-computers-share-button.png" width="440"> |

**Share dialog, local computer: Access history**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/06-share-local-access-history.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/06-share-local-access-history.png" width="440"> |

**Access dialog, cloud computer: Access history**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/07-share-cloud-access-history.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/07-share-cloud-access-history.png" width="440"> |

**Chat invite names the computer it shares and what that allows**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/08-chat-invite-computer-confirm.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/08-chat-invite-computer-confirm.png" width="440"> |

**After removing someone from a chat: offer to stop sharing the computer**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/09-chat-remove-stop-sharing.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/09-chat-remove-stop-sharing.png" width="440"> |

**Settings: who can use this computer's agents**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/10-local-runtime-copy.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/10-local-runtime-copy.png" width="440"> |

**Settings: who can use Local exec**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/11-local-exec-copy.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/11-local-exec-copy.png" width="440"> |

**"Leave workspace" says what leaving breaks**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/12-leave-workspace-confirm.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/12-leave-workspace-confirm.png" width="440"> |

**Inbox without the dead "Requests to use your computer" section**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/13-inbox-no-approval-section.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/13-inbox-no-approval-section.png" width="440"> |

**"No longer available" says the computer may no longer be shared, and wraps**

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/before/14-agent-gone-banner.png" width="440"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/230da92b76c9bbd8ea9913dd180df91c1ada12c8/a0b6e67/after/14-agent-gone-banner.png" width="440"> |

- **Flow exercised:** Each surface above rendered from the real component in both trees and driven with playwright-core and headless Chromium: opening the invite window, the pending-invite menu, both Share dialogs with history, the chat invite and removal confirms, the settings sections, the Inbox and the agent banner.
- **Build and environment:** macOS (Apple Silicon), this branch rebased on `282f164f0`. Captures on Linux x64 with Chromium.
- **Result:**
  - Backend: `tsc` clean. `bun test src/lib src/routes`: 5,517 pass, 18 fail. The same 18 fail on main on this Mac (avatar and photo processing, loopback lookups, Windows paths, the Kubernetes exec socket, one timing test, one that needs Linux `readlink -f`). None are in files this PR touches.
  - Desktop: `tsc -b` clean. Node tests: 3,257 pass, 1 fail (`agent-cli-apps.test.ts`, which finds this Mac's `/opt/homebrew/bin/codex`). `test:ui`: 68 pass, 0 fail.
  - iOS: `apps/ios/tests/run.sh` passes, and the simulator build succeeded before the review fixes, which touch no iOS code.
  - `prettier --check` clean and ESLint 0 errors on the changed files.
- **Automated test added or updated:**
  - Backend: `routes/invitations.test.ts` (Admin invitation after the inviter loses admin), `routes/teams/invitations.test.ts` (role, resend, link for admins only), `conversation-computer-use.test.ts`, the participants route tests, `sign-in-request.test.ts`, `sign-in-signers.test.ts`, `management.test.ts` (role change), `routes-devices-access-audit.test.ts` (owner change).
  - Desktop: `BoxRow`, `useComputerSharing`, `useMemberActions`, `AccessHistory` and `ContextMenu` UI tests (added to `test:ui`), `accessChanges.test.ts`, `computerAccessNotice.test.ts`, `electron/agent/notify.test.ts`, `agentSignInModel.test.ts`, `runtimeControlSignOut.test.ts`.
  - The new tests fail on main where a behaviour changed.
- **Not verified:**
  - Not clicked through in a packaged Desktop app. The OS notification click was not tried in a packaged build.
  - Android was not compiled locally (no JDK on this Mac), so CI is the build check for `apps/android`.
  - The stop-computer-use route's success path is not run end to end: the in-memory test database cannot do a positional `$pull`, so the exact update is checked in `conversation-computer-use.test.ts`.
  - The "shared with you" notice is Desktop only and arrives when the app next loads the device list (up to a minute, or at next launch). The system notification only fires for a visible, unfocused window.
  - Known and left for a follow-up: the stop-computer-use route accepts a teammate who was never in the chat (the caller must already manage the computer), invitations never expire, and the Desktop approval IPC kept for step 3 of #1328 is now unused.

Refs #730, #1328, #1391, #2431

🤖 Generated with [Claude Code](https://claude.com/claude-code)
