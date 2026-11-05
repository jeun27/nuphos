## What

The composer's banner can leave you stuck when **Claude Code or Codex on this computer** is signed out. That's the usual state after a rejected refresh token wipes the saved login (#1120).

- A **member** saw "…is signed out. Ask a workspace administrator to reconnect this runtime." and no button.
- An **admin** saw "Runtime settings", which opens the team Runtimes page, not the sign-in.
- Send is blocked while the agent is signed out. That means no turn can fail, so the failed-turn card with its own **Sign in again** (`AgentSetupRequiredCard`) never shows. The only way out was the small "Sign in" chip inside the runtime picker.

**Root cause.** The banner had its own copy of "who can fix this agent and how" (`ownSignIn`, `askOwner`, `resume`). It only allowed a sign-in for a *remote* computer. The picker already gets this right through `agentProblem` + `usePickerFixes`, which give this computer's agent its CLI sign-in.

**Fix: remove the second copy.** The banner now asks `agentProblem` for the agent's fix and runs it through `usePickerFixes`, the same code the picker uses, so the banner and the picker can no longer disagree.
- This computer's signed-out agent gets **Sign in**, which opens the same `LocalAgentSignIn` dialog as the picker, for members and admins alike.
- Your own Box or other computer still gets **Sign in** (`RuntimeLoginDialog`).
- Your own paused Box still gets **Resume**, now through the picker's `resumeComputer`, which also covers the paywall case.
- Everything else is unchanged. A teammate's computer still reads "Ask its owner to sign it in". An offline computer still shows Retry. A new chat still shows Switch runtime.

The banner's sign-in and offline copy moves to `agentBannerCopy.ts`, so it can be tested without React. `bannerActions.ts` (`resumeBox`) had no other caller and is removed. `usePickerFixes`' `closeMenu` is now optional, since the banner has no menu.

Part of the runtime sign-in dead-end audit. **Merge order:** this goes before the PR that adds a working "Ask" for teammates' computers, which builds on this banner using the picker's fixes.

## Test

- New `agentBannerCopy.test.ts` (4 tests) runs each case through `agentProblem` → banner copy → its action:
  - this computer's signed-out agent → **Sign in**, which runs the CLI sign-in (members too);
  - your own other computer → **Sign in**, which runs the runtime sign-in;
  - a teammate's computer → "Ask its owner", no button;
  - offline → Resume for your own paused Box, Retry otherwise, Switch runtime in a new chat.
- Desktop `node --test`: 2685 tests, 2684 pass. The only failure is `electron/local-terminal.test.ts`, which fails identically on main in this sandbox (no `node-pty` native build); CI builds it.
- `tsc -b --noEmit` is clean. ESLint has 0 errors and no new warnings: `AgentStatusBanner` complexity drops from 37 to 19. Prettier is clean. No locale keys added.
- **Reproduced end to end:** the real `Composer` was rendered in a page-only harness with fixture data (viewer Alex, a member; "Alex's MacBook" is this computer, Claude Code signed out), on main and on this branch. On main the banner has no action. On this branch **Sign in** opens "Connect Claude on this computer". Captures are in the Visuals comment.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
