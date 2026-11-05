## What

On iPhone, a conversation whose runtime can't take a turn shows red text and nothing to press. Some of that text also points at a desktop menu the phone doesn't have.

- **Runtime errors** (`runtime_not_found`, `runtime_disabled`, `runtime_offline`, `runtime_login_required`) are a red `HintRow` only. They say "Start a new agent on another runtime", though the conversation itself can move.
- **Owner declined** (a teammate's computer shared as "Ask me first"): "Move it to another agent to continue", with no button.
- **Runtimes › Sign in** instructions say "go to Settings → Runtimes". That page doesn't exist; Runtimes is a page in the desktop sidebar. For a teammate's computer you only `use`, the screen tells *you* to sign in on *their* computer.
- **The composer's runtime chip disappears** when the conversation's runtime is no longer in the list and has no display name. The chip was the one control that moves the conversation.

**Fix.** It uses the conversation's own existing "Switch runtime" (the runtime sheet that moves the conversation, already in the ⋯ menu for anyone who can manage it):
- `HintRow` takes an optional `onSwitchRuntime`. The four runtime errors show **Switch runtime** under the text when the viewer can manage the conversation. Their copy now says to switch. `AgentChatAPI.switchRuntimeErrors` is the set of those messages.
- `ShareApprovalStrip` shows **Switch runtime** when the owner declined.
- The sign-in instructions name the Runtimes page "in Nuphos on a computer". For a teammate's computer they say only its owner can sign it in and to ask them.
- The chip falls back to "Choose runtime" instead of disappearing.

The Ask-to-sign-in flow on mobile is left out; it's a design question, tracked in its own issue. Android gets the same changes in its own PR.

Part of the runtime sign-in dead-end audit. It's independent of the other PRs in the series.

## Test

- `tests/ShareApprovalTests.swift`: the declined message now says to switch runtime. `bash tests/run.sh`: TESTS_RESULT.
- The app builds for the iOS 27.2 simulator (Debug, `xcodebuild … build`).
- **Captures:** the real `HintRow`, `ShareApprovalStrip` and `AgentSignInInstructions`, rendered with fixture data in a temporary capture screen. That screen was launched with `-harness`, used on main and on this branch, and never committed. Taken on an iPhone 17 simulator, light mode, with `simctl io screenshot`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
