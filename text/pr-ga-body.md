## What

The Android counterpart of #1590 (iOS). On a phone, a conversation whose runtime can't take a turn showed red text with nothing to press. Some of that text pointed at desktop menus.

- **Runtime errors** (`runtime_login_required`, `runtime_disabled`, `runtime_not_found`, `runtime_offline`) were passed through raw as `Conflict.Other`. The server's text says, for example, "Enable it in **Settings → Agent**". Nothing could be pressed.
- **Owner declined** (a teammate's computer shared as "Ask me first"): "Move it to another agent to continue", with no button.
- **Runtimes › Sign in** instructions said "go to Settings → Runtimes". For a computer you only `use`, they told *you* to sign in on the owner's computer.

**Fix.** It uses the conversation's existing runtime sheet (`ConversationAgentSheet`, the one the ⋯ menu's "choose runtime" opens), which moves the conversation:
- `AgentChatApi.conflict` maps the four codes to `Conflict.RuntimeBlocked`, worded for a phone (the same words as iOS). `AgentChatApi.switchRuntimeErrors` is the set of those messages.
- A `ChatRow.Hint` with one of them shows **Switch runtime** for anyone who can manage the conversation.
- The declined strip shows **Switch runtime**.
- The sign-in instructions name the desktop's Runtimes page. For a computer the viewer only `use`s, they say only its owner can sign it in and to ask them.

The Ask-to-sign-in flow on mobile is left out; it's a design question for its own issue.

Part of the runtime sign-in dead-end audit. It's independent of the other PRs in the series.

## Test

- New `RuntimeBlockedConflictTest`:
  - all four codes become `RuntimeBlocked`, never mention Settings, and are in `switchRuntimeErrors`;
  - other codes keep the server's text.
- `ShareApprovalTest`: the declined message says to switch runtime.
- CI runs `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. There's no Android SDK in the sandbox I work from, so CI is the build and test run for this PR.
- **Visuals: not captured yet.** No Android emulator is available to me (no KVM in my sandbox, and no Android SDK on the Mac I use). I'll post a full "Visuals for <head>" comment once one is set up. The iOS PR #1590 shows the same states and copy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
