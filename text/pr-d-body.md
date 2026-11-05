## What

When a conversation's agent is removed from the workspace (or disabled), the conversation still looks sendable.

- The runtime chip says "· Unavailable", with no reason and no banner.
- Send isn't blocked. `runtimeControlSendBlock` only checks `value.status === 'disabled'`, and a removed agent has no status at all.
- So the message goes out, and the backend answers `404 runtime_not_found`. Desktop shows it raw in the plain error box, with no button: "Agent chat request failed with runtime_not_found (HTTP 404 Not Found)." plus request ids.

`conversationRuntimeControl` already knows this state: it sets `unavailable` once the runtime list has loaded and the conversation's agent isn't active in it. Nothing acted on it except the chip.

**Fix: treat `unavailable` as a state of its own.** `runtimeGone(control)` means `unavailable` is set and the conversation names an agent.
- **Send** is blocked. If the viewer can move the conversation, the reason is "Choose a runtime to send"; otherwise it's "{name} is no longer available."
- **Banner:** "{name} is no longer available." with **Switch runtime**, which opens the runtime picker, where choosing another agent moves the conversation. The banner uses the composer's existing hook for opening the picker (the one a new chat uses). Someone who can't move the conversation, such as a teammate who doesn't manage it, sees the reason without a button.

A `runtime_disabled` conversation gets the same banner. Its send was already blocked.

New locale key: "{name} is no longer available.", inserted in all 7 locales. Nothing else in the locale files changed.

Part of the runtime sign-in dead-end audit. Rebased onto main after #1585 merged.

## Test

- `runtimeControlSignOut.test.ts`: new test for `runtimeGone`.
  - It blocks send with "Choose a runtime to send" for someone who can move the conversation, and with "{name} is no longer available." for anyone else.
  - It isn't set while the runtime list is unknown or the conversation names no agent.
- Desktop `node --test`: 2707 pass, 1 fail. The failure is `electron/local-terminal.test.ts`, which also fails on main in this sandbox (no `node-pty` native build).
- `tsc -b --noEmit` is clean. ESLint has 0 errors. `Composer.tsx` stays under its 300-line limit. Prettier is clean. `i18n.test.ts` passes.
- **Reproduced** in a page-only harness of the real `Composer`. Fixtures: a conversation on "Build agent", which is no longer in the runtime list.
  - **On main:** no banner, and Send is enabled with a message typed.
  - **On this branch:** the banner shows with Switch runtime, Send is disabled, and Switch runtime opens the picker.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
