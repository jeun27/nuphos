## What

When an agent on a **teammate's computer** (one you have `use` on, #1517) is signed out, nothing you can press tells its owner.

- **Banner:** "…is signed out. Ask its owner to sign it in." with no button.
- **Picker:** the row says "Signed out · Ask Taylor". Clicking it does nothing: `usePickerFixes.run` has no `ask` branch, so the menu just stays open.
- The one real ask, `AgentSetupRequiredCard`'s **Ask {name} to sign in** (`runtimeSignInAsk`, #1117), only shows after a failed turn. Send is blocked while the agent is signed out, so that turn never happens.

**Fix.** The `ask` fix for a sign-in now carries its `runtimeId`. `usePickerFixes` takes the conversation's `sessionId` and runs that ask with the same `api.runtimeSignInAsk` + `rememberSignInAsk` the card uses. Since #1575 the banner runs the picker's fixes, so both places get it:
- **Banner:** **Ask {name} to sign in**. Once sent, the banner reads "Asked {name}. You can send once they sign it in." and has no button. It leaves when the owner signs in.
- **Picker:** the row gets an **Ask to sign in** chip, and clicking the row sends the ask too. The menu then closes and the banner shows that you asked.

The ask is offered only when it can be sent: a signed-out agent, inside a conversation (the server keeps the ask on the conversation). A new chat still offers **Switch runtime**. A teammate's **paused** computer has no `runtimeId` on its ask, because a sign-in ask can't wake it, so it keeps today's "Ask {name}" text and Retry.

The same picker ask now also works for a member on a signed-out **team** agent: the ask goes to the admins, as `signInRecipients` already decides.

New locale key: "Asked {name}. You can send once they sign it in.", inserted in all 7 locales. Nothing else in the locale files changed.

Part of the runtime sign-in dead-end audit. Builds on #1575 (merged). It touches `ReadOnlyNotice.tsx` and `usePickerFixes.tsx`, which the PR for deleted runtimes in this series doesn't touch.

## Test

- `agentBannerCopy.test.ts`: 2 new tests.
  - A teammate's signed-out computer in a conversation offers **Ask Taylor to sign in**, which runs the ask fix for that runtime.
  - Once asked, the banner names who you asked and has no button.
- `agentRowFix.test.ts`: sign-in asks now carry their `runtimeId`. A paused computer's ask doesn't.
- Desktop `node --test`: 2696 pass, 1 fail. The failure is `electron/local-terminal.test.ts`, which also fails on main in this sandbox (no `node-pty` native build).
- `tsc -b --noEmit` is clean. ESLint has 0 errors. Prettier is clean. `i18n.test.ts` passes.
- **Reproduced end to end** in a page-only harness of the real `Composer` and picker. Fixtures: viewer Alex, conversation `s-1` on "Taylor's Mac mini", signed out.
  - **On main:** the banner has no button, and clicking the picker row makes no request.
  - **On this branch:** the banner button and the picker row each call `runtimeSignInAsk('t-1', 'local_u-taylor_dev-tay', 's-1')`, and the banner then shows "Asked Taylor Kim…".

🤖 Generated with [Claude Code](https://claude.com/claude-code)
