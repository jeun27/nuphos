## What

Several runtime messages send people to a "Settings → Runtimes" or "Settings → Agent" page. Neither exists: Runtimes is a page in the sidebar (`TEAM_MANAGEMENT_NAV_ITEMS`), and Settings has no Runtimes or Agent section. Someone whose agent signed itself out (#1120) reads the reauth message, opens Settings, and finds nothing there.

This PR changes only the wording, to "the Runtimes page":

| Where | Who sees it |
| --- | --- |
| `electron/agent/stream-errors.ts`, reauth event | anyone whose runtime sign-in stopped working |
| `agentEventsApply.ts`, `agent-setup-required` fallback | a turn refused for setup with no message |
| `boxPresentation.ts` `boxSetupProblem` (2 strings) | a cloud computer that didn't start during setup |
| onboarding `LocalAgentsStep` and `SetupComplete` hints | every new user and invited teammate |
| backend `runtime-routing.ts` | a provider not set up in the workspace |
| backend `conversation-chat-route.ts`, `runtime_disabled` | a conversation on a disabled agent |

**Left alone on purpose:**
- `RuntimeSelector`'s and `startChat`'s "no runtime" copy. Another PR is reworking the home composer's no-runtime state.
- The iOS and Android copy. It moves in the mobile PR of this series, which also adds buttons there.
- Dashboard panel errors (`dashboards/exec/*`), Slack's `agent-error-notice.ts`, and code comments. They aren't on the sign-in path.

Locales: each of the 4 changed `t()` keys is replaced on its own line in all 7 locales, with the existing translation of "Runtimes" (for example ［ランタイム］ページ, 「執行環境」頁面). Nothing is reordered or reformatted. The two zh and the es strings that had kept "Runtimes" in English now use the localized page name.

Part of the runtime sign-in dead-end audit. It's independent of the other PRs in the series.

## Test

- `src/i18n/i18n.test.ts` (every locale translates exactly the strings in use, placeholders match), `chat-http-failure.test.ts` and `boxPresentation.test.ts`: 39 pass, 0 fail.
- Backend `runtime-routing.test.ts` now expects "Runtimes page": 29 pass. `bun test src/lib/claude-code-preview`: 968 pass, 2 fail. The same 2 tests (self-hosted MCP mount and skill bundle URLs) fail on main in this sandbox because of its environment. CI runs them.
- Prettier is clean.
- Page-only captures of the real onboarding step and its last screen with fixture data, before and after. They're in the Visuals comment.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
