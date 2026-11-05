Part 1b of #1570, and the rest of the audit's F5. #1574 merged with its first commit only; its second commit (ab1af221) was pushed after the merge and never landed, so it is re-applied here on current `main`, together with a fix for one more bug. Frontend only, no schema change.

## Problem

1. **New runtime ("+") on a capable host always creates a runtime**, even when a signed-out one of that provider is right there. A lapsed sign-in turns into "Claude Code 2".
2. **A new cloud computer whose first Claude sign-in was cancelled** loses its Claude Code. Never signed in, it is hidden (`visibleAgent`), and "+" offers only a new "Claude Code 2", so there is no way back to sign it in.
3. **A signed-out default runtime on a Box or another computer** has no Sign in on its page or in its ⋯ menu. The menu offers Sign in only for managed and self-hosted runtimes.

## Fix

- **`newAgentAction`** signs in a signed-out (or never-signed-in) runtime of that provider before it adds one. The "+" menu item then reads "Sign in to Claude Code". A second runtime is still added when every runtime of that provider is signed in, for a different account. This fixes 1 and 2: the hidden agent is in the catalog that "+" reads (`BoxSection` gets `catalog.instances`, not the visible list).
- **`localSignIn`** (renamed from `thisComputerSignIn`) covers every signed-out runtime on the viewer's own computers. This computer's default Claude Code or Codex uses its CLI, as before. Everything else uses the runtime sign-in for exactly that runtime (`RuntimeLoginDialog` → `POST /agent-runtimes/:id/login`, which the backend allows for anyone with `use`). The card (`LocalAgentSignInRow`) and the ⋯ menu both offer it. This fixes 3.
- `newAgentAction` moves to `agentPresentation.ts`, as `boxPresentation.ts` sits at its 300-line limit.

No new strings: it reuses `Sign in`, `Not signed in.` and `Sign in to {provider}`.

## Before / after

Captured from the real components in a page-only harness at `main` (45122135) and this branch, with fixture data ("Build Box", user Alex) and the light theme. The fixture records which login each click starts.

**New cloud computer, first Claude sign-in cancelled**

| | Before | After |
| --- | --- | --- |
| Page | <img src="R/before-page.png" width="400"><br>Claude Code is hidden | same: still hidden until signed in |
| "+" | <img src="R/before-plus.png" width="400"><br>Creates "Claude Code 2" | <img src="R/after-plus-menu.png" width="400"><br>"Sign in to Claude Code" |
| "+" → Claude Code | | <img src="R/after-plus.png" width="400"><br>Started `runtime:local_user-alex_device-buildbox` |

**Default Claude Code on "Build Box", signed out**

| | Before | After |
| --- | --- | --- |
| ⋯ menu | <img src="R/box-before-menu.png" width="400"><br>No Sign in | <img src="R/box-after-menu.png" width="400"><br>**Sign in** for that runtime |
| "+" → Claude Code | <img src="R/box-before-plus.png" width="400"><br>Creates "Claude Code 2" | <img src="R/box-after-plus.png" width="400"><br>Signs in the existing one |

## Tests

- `agentPresentation.test.ts`, `localSignIn`: CLI for this computer's default; `'runtime'` for added runtimes, other computers and other providers; nothing when signed in or someone else's.
- `agentPresentation.test.ts`, `newAgentAction`: a lapsed runtime and a never-signed-in hidden one (`visibleAgent` false) are signed in, not added; it adds when all are signed in.
- `npm test` in `apps/desktop`: 2708/2712 pass. The one failing file is `electron/local-terminal.test.ts`, which fails the same way on `main` in my sandbox because `node-pty`'s native module isn't built there.
- `tsc -b --noEmit` passes. Prettier is clean, and eslint reports no errors and no new warnings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
