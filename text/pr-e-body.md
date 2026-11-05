## What

Onboarding (and the invite-join setup, #1468) leaves a new user stuck when Claude Code or Codex isn't installed. The card is dimmed and shows only:
- "Install this runtime to get started",
- "Nuphos couldn't find `claude`… add it to your login shell's PATH, then reopen Nuphos",
- a "How to install" link to the vendor docs.

There's no button. After installing from a terminal, nothing on the step looks again, so the copy says to quit and reopen Nuphos.

Settings already has both actions on its local runtime card: **Install {name}**, which runs the vendor's installer through `localRuntimeInstallAgent`, and **Check again**, which calls `localRuntimeRefresh`.

**Fix: reuse them, don't rebuild them.** `InstallButton` is exported from `LocalAgentCard.tsx` unchanged. The onboarding card's "missing" state now shows **Install {name}** and **Check again** under the existing PATH hint. The "How to install" link stays.

The card is no longer dimmed while missing. With buttons on it, the dimming read as "disabled". **@Lin, design call:** say if you'd rather keep a lighter treatment.

No new strings: "Check again" and "Install {name}" already exist in all 7 locales.

Part of the runtime sign-in dead-end audit. It's independent of the other PRs in the series.

## Test

- **Reproduced** in a page-only harness of the real `LocalAgentsStep`, with fixture state in which neither `claude` nor `codex` is installed.
  - **On main:** no button on either card.
  - **On this branch:** both cards show Install and Check again. Clicking them calls `localRuntimeRefresh()` and `localRuntimeInstallAgent('claude-code')`, as recorded by the stub. Installing shows the button's own "Installing…" state.
- `tsc -b --noEmit` is clean. ESLint has 0 errors. Prettier is clean. `i18n.test.ts` passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
