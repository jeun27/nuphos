## What

Small dead ends around runtime sign-in, where the desktop gave no way forward. Four are fixed here. The fifth one from the audit is real but belongs to #1570 part 1 (see the end).

**1. Grok Build or OpenCode on this computer, after a failed turn: a card with no button.**
`signInRoute` returned `{ kind: 'none' }` for `_grok` / `_opencode` on this computer, so `AgentSetupRequiredCard` showed "Sign in again to continue" with only the reauth text. Its hint and settings buttons are both guarded off for a personal agent on this computer. The picker already handled this case: `agentRowFix` turned `none` into the runtime sign-in "as in settings".

Fix: `signInRoute` sends these agents to the runtime sign-in itself, through the same owner branch that a member's own Box takes. The card now shows **Sign in and resend**, which opens `RuntimeLoginDialog`. One rule instead of a `none` that a caller had to patch up.

**2. An outdated runtime greys out Send with no reason.**
A runtime snapshot with `schemaVersion !== 2` will never take a message, so Composer blocks Send. The reason the button shows (title, plus "Send (reason)" for screen readers) only came from `runtimeControlSendBlock`, which was null here. The "runtime update required" toast never fires either, because a blocked Send never dispatches.

Fix: the inline 6-line check moves to `runtimeSendRefusal(snapshot)` in `queuedAutoSend.ts`, next to `runtimeMayAcceptLater`. It returns `runtimeStateLabel` ("Runtime status unavailable — runtime update required"), which Composer shows as Send's reason. `Composer.tsx` gets 6 lines shorter.

**3. A cancel that keeps failing traps the sign-in dialog.**
X, Escape and Cancel all run through `cancel()`, which returned false whenever the cancel request failed ("the caller should stay"). If the request keeps failing, for example because the local runtime or the backend isn't answering, every close attempt shows the same toast and the dialog never closes.

Fix: in both `useRuntimeLogin` and `useLocalAgentLogin`, the first failed cancel still keeps the dialog open so you can try again, and closing again leaves. A runtime attempt expires on its own (the backend fails it after its time limit), and reopening a local sign-in picks up the attempt already running.

**4. "Starting your runtime… sign in from its card" waits forever.**
Signing in an agent whose computer isn't up yet polled `/status?wake=1` every 2 s, with no end. The copy promised "you can close this and sign in from its card once it is running", but a cloud computer's agent has no Sign in on its card yet (#1570 part 1 is adding it).

Fix: after `BOX_SETUP_TIMEOUT_MS` (5 minutes, the same limit as Box setup), the wait ends with `boxSetupProblem('timeout')`: "The computer has not started after 5 minutes. Delete it on the Runtimes page and try again." The dialog then shows **Try again**, which restarts the wait. The spinner's copy no longer promises the card: "Starting your runtime… This can take a few minutes."

**Not fixed here: cancelling a new cloud computer's first sign-in hides its agent.** This is real. `visibleAgent` hides an agent that never signed in. The computer's **+** then creates a second agent (`newAgentAction` returns `create` on a host that supports several agents) instead of signing in the hidden one. #1570 part 1's rule, "Add signs the existing signed-out runtime in instead of creating a new one", fixes this too. It changes the same `newAgentAction`, so I've left it to that work rather than collide with it.

**Left for review, not deleted:** with `signInRoute` handling Grok and OpenCode, `agentRowFix`'s `route.kind === 'none'` → own-computer `signIn` fallback looks unreachable, since the picker always passes the instance.

One locale key is replaced in place in all 7 locales: the spinner's "…sign in from its card once it is running." becomes "Starting your runtime… This can take a few minutes." Part of the runtime sign-in dead-end audit. It's independent of the other PRs. #1586 also edits `Composer.tsx`, in different lines.

## Test

- `agentSignInModel.test.ts`: Grok Build on this computer gets the runtime sign-in dialog.
- `queuedAutoSend.test.ts`: `runtimeSendRefusal` gives the update reason for an outdated runtime, and null for a runtime that can take a message later, a disconnected one, or none.
- `agentSignInModel`, `queuedAutoSend` and `agentRowFix` tests: 26 pass, 0 fail. `tsc -b --noEmit` is clean. ESLint has 0 errors. Prettier is clean.
- **Reproduced** in a page-only harness (also for 3 and 4):
  - **Cancel that keeps failing** (`localRuntimeCancelClaudeLogin` rejects): on main, the dialog is still open after two Cancel clicks. On this branch it closes on the second.
  - **Computer that never comes up** (status always `online: false`, 6.5 minutes on Playwright's fake clock): on main, it's still the spinner. On this branch it shows the timeout reason plus **Try again**.
  - **Card:** on main, the Grok card has no button. On this branch it shows **Sign in and resend**.
  - **Composer** with an outdated runtime snapshot: on main, Send is disabled with aria-label "Send" and no title. On this branch the aria-label is "Send (Runtime status unavailable — runtime update required)" and the same text is the tooltip.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
