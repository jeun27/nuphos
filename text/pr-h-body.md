## What

Two small dead ends where the runtime can't take a message and the desktop gives no way forward.

**1. Grok Build or OpenCode on this computer, after a failed turn: a card with no button.**
`signInRoute` returned `{ kind: 'none' }` for `_grok` / `_opencode` on this computer, so `AgentSetupRequiredCard` showed "Sign in again to continue" with only the reauth text. Its hint and settings buttons are both guarded off for a personal agent on this computer. The picker already handled this case: `agentRowFix` turned `none` into the runtime sign-in "as in settings".

Fix: `signInRoute` sends these agents to the runtime sign-in itself, through the same owner branch that a member's own Box takes. The card now shows **Sign in and resend**, which opens `RuntimeLoginDialog`. One rule instead of a `none` that a caller had to patch up.

**2. An outdated runtime greys out Send with no reason.**
A runtime snapshot with `schemaVersion !== 2` will never take a message, so Composer blocks Send. The reason the button shows (title, plus "Send (reason)" for screen readers) only came from `runtimeControlSendBlock`, which was null here. The "runtime update required" toast never fires either, because a blocked Send never dispatches.

Fix: the inline 6-line check moves to `runtimeSendRefusal(snapshot)` in `queuedAutoSend.ts`, next to `runtimeMayAcceptLater`. It returns `runtimeStateLabel` ("Runtime status unavailable — runtime update required"), which Composer shows as Send's reason. `Composer.tsx` gets 6 lines shorter.

**Not changed:**
- Closing the sign-in dialog when its cancel fails: `cancel()` documents that the caller should stay.
- A new cloud computer's agent hiding after a cancelled first sign-in: `visibleAgent`'s own rule; #1574 reworked Add for signed-out agents.

**Left for review, not deleted:** with `signInRoute` handling Grok and OpenCode, `agentRowFix`'s `route.kind === 'none'` → own-computer `signIn` fallback looks unreachable, since the picker always passes the instance.

No new strings. Part of the runtime sign-in dead-end audit. It's independent of the other PRs. #1586 also edits `Composer.tsx`, in different lines.

## Test

- `agentSignInModel.test.ts`: Grok Build on this computer gets the runtime sign-in dialog.
- `queuedAutoSend.test.ts`: `runtimeSendRefusal` gives the update reason for an outdated runtime, and null for a runtime that can take a message later, a disconnected one, or none.
- `agentSignInModel`, `queuedAutoSend` and `agentRowFix` tests: 26 pass, 0 fail. `tsc -b --noEmit` is clean. ESLint has 0 errors. Prettier is clean.
- **Reproduced** in a page-only harness:
  - **Card:** on main, the Grok card has no button. On this branch it shows **Sign in and resend**.
  - **Composer** with an outdated runtime snapshot: on main, Send is disabled with aria-label "Send" and no title. On this branch the aria-label is "Send (Runtime status unavailable — runtime update required)" and the same text is the tooltip.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
