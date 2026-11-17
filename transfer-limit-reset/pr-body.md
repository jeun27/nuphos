## Summary

Part of #3198 (split out as asked there). This is only the rate-limit message for the agent. The refund of a failed upload's transfer slot is a separate PR, already merged as #3218. This branch is rebased on it. The failed-tool-call marking in the Desktop transcript is another separate PR.

Each team can start 60 file transfers (or 5 GiB) per UTC hour (`file-transfer/admission.ts`). When a team is over that, `local_upload` already returns `file_transfer_rate_limited`, but nothing more. The agent is not told when the limit resets or that retrying will not help. So it keeps calling `local_upload`, and every call fails the same way until the hour turns.

With this change:

- The admission's 429 says when the hour resets ("Try again after 19:00 UTC.") and carries `retryAfter`, the ISO time of the next UTC hour, in its details.
- `local_upload` returns `{ error: 'file_transfer_rate_limited', message, retryAfter }`. `message` is written in `upload.ts` ("This team used its hourly file-transfer limit. It resets at 19:00 UTC. Do not retry; tell the person."), never the raw service message. `retryAfter` is passed on only if it parses as a time. If it does not, the message says the limit resets at the next hour. Other transfer errors still return their code only.
- The `local_upload` tool description and the file-transfer `SKILL.md` tell the agent not to retry on `file_transfer_rate_limited`. They also say to tell the person when the limit resets, and to offer to work with what is already in the sandbox.

Code: `admission.ts` (the message and `retryAfter`), `errorFrom` and the `LocalUploadResult` type in `devices/upload.ts`, the description in `tools-skilled/local-upload.ts`, and `builtin-skills/skills/file-transfer/SKILL.md`.

Real-backend e2e: a new scenario, "a rate-limited upload returns the reset time and the agent is told not to retry", in `scripts/e2e/transfer-limit-scenarios.ts`. It is listed in `computerScenarios` after the refund scenario from #3218 and before the box scenarios, so the scenarios whose transfers have to go through run first. The limit is a constant (`TRANSFER_GROUPS_PER_HOUR`) and no environment variable sets it. So the scenario does not change product code. It fills the team's counter for this hour (and the next, in case the hour turns during the scenario) to 60 in the suite's own MongoDB. Then it asks the fixture agent to call `local_upload` on a file on the app's computer and checks the answer:

- it carries `file_transfer_rate_limited`;
- it has a `retryAfter`, and the start of the next hour appears in it (checked with plain string matches, no regex);
- it says "Do not retry";
- it holds no signed URL.

Afterwards the counters are put back as they were. The scenario does not import from `computer-scenarios.ts`, so the two files do not import each other.

## How this was verified

- **Flow exercised:** the real-backend scenario, in CI only, plus unit tests here. The "Desktop against a real backend" job on this PR's previous head (run 44028897621) printed `PASS a rate-limited upload returns the reset time and the agent is told not to retry` and `PASS Desktop end-to-end (real backend, MongoDB and OpenAB; fixture agent)`. Since then the scenario has only lost a regex and a comment line, and it has not been run again.
- **Build and environment:** Linux sandbox, branch rebased on `origin/main` 0fcd14d3, backend tests with bun. The e2e ran on the CI runner.
- **Result:**
  - `bun test src/lib/file-transfer/ src/lib/agent/devices/upload.test.ts`: `36 pass`, `0 fail`, "Ran 36 tests across 6 files". This includes the refund tests from #3218.
  - `bun run typecheck` (backend): clean.
  - `eslint` on the five backend files: `0 errors`, 56 warnings.
  - `eslint` with the root config on `scripts/e2e/transfer-limit-scenarios.ts` and `scripts/e2e/computer-scenarios.ts`: no problems. The previous head's scenario file reproduces the two "Dev scripts" errors under the same config.
  - `prettier@3.9.6 --check` on all changed files: "All matched files use Prettier code style!".
  - `wc -l`: `computer-scenarios.ts` 240, `run.ts` 276 (not touched).
- **Automated test added or updated:**
  - `admission.test.ts`: "the limit error says when the hour resets".
  - `upload.test.ts`: "the hourly limit tells the agent when it resets and not to retry". "size and rate limits return only their known code" now also checks that nothing from the error's details (a `signed` value) reaches the result.
  - With `admission.ts` and `upload.ts` put back to `origin/main`, both new tests fail: `(fail) the limit error says when the hour resets`, `(fail) the hourly limit tells the agent when it resets and not to retry`, `11 pass`, `2 fail`.
  - e2e: "a rate-limited upload returns the reset time and the agent is told not to retry".
- **Not verified:**
  - The e2e scenario at this head. It has not been run locally either: this sandbox is missing `playwright-core`, `pnpm`, the Electron binary, an `openab` binary and the MongoDB and RustFS images.
  - Whether a real model obeys "Do not retry". The fixture agent does not read the description or the skill. The scenario checks only that the answer says it.
  - Whether the scenario still passes when it runs together with the refund scenario from #3218. That combination first runs in this PR's CI.

Fixes #3214. Refs #3198

🤖 Generated with [Claude Code](https://claude.com/claude-code)
