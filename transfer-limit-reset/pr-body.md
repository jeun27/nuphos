## Summary

Part of #3198 (split out as asked there). This is only the rate-limit message for the agent. The refund of a failed upload's transfer slot and the failed-tool-call marking in the Desktop transcript are separate PRs.

Each team can start 60 file transfers (or 5 GiB) per UTC hour (`file-transfer/admission.ts`). When a team is over that, `local_upload` already returns `file_transfer_rate_limited`, but nothing more. The agent is not told when the limit resets or that retrying will not help. So it keeps calling `local_upload`, and every call fails the same way until the hour turns.

With this change:

- The admission's 429 says when the hour resets ("Try again after 19:00 UTC.") and carries `retryAfter`, the ISO time of the next UTC hour, in its details.
- `local_upload` returns `{ error: 'file_transfer_rate_limited', message, retryAfter }`. `message` is written in `upload.ts` ("This team used its hourly file-transfer limit. It resets at 19:00 UTC. Do not retry; tell the person."), never the raw service message. `retryAfter` is passed on only if it parses as a time. If it does not, the message says the limit resets at the next hour. Other transfer errors still return their code only.
- The `local_upload` tool description and the file-transfer `SKILL.md` tell the agent not to retry on `file_transfer_rate_limited`. They also say to tell the person when the limit resets, and to offer to work with what is already in the sandbox.

Code: `admission.ts` (the message and `retryAfter`), `errorFrom` and the `LocalUploadResult` type in `devices/upload.ts`, the description in `tools-skilled/local-upload.ts`, and `builtin-skills/skills/file-transfer/SKILL.md`.

Real-backend e2e: a new scenario, "a rate-limited upload returns the reset time and the agent is told not to retry", in `scripts/e2e/transfer-limit-scenarios.ts`. It is listed at the end of `computerScenarios`, after the scenarios whose transfers have to go through. The limit is a constant (`TRANSFER_GROUPS_PER_HOUR`) and no environment variable sets it. So the scenario does not change product code. It fills the team's counter for this hour (and the next, in case the hour turns during the scenario) to 60 in the suite's own MongoDB. Then it asks the fixture agent to call `local_upload` on a file on the app's computer and checks the answer:

- it carries `file_transfer_rate_limited`;
- its `retryAfter` is the start of the next hour;
- it says "Do not retry";
- it holds no signed URL.

Afterwards the counters are put back as they were. The scenario does not import from `computer-scenarios.ts`, so the two files do not import each other.

## How this was verified

- **Flow exercised:** unit tests only. The real-backend scenario was written but not run here (see "Not verified").
- **Build and environment:** Linux sandbox, branch on `origin/main` 9b58fc7f, backend tests with bun.
- **Result:**
  - `bun test src/lib/file-transfer/admission.test.ts src/lib/agent/devices/upload.test.ts`: `13 pass`, `0 fail`.
  - `bun run typecheck` (backend): clean.
  - `eslint` on the five backend files: `0 errors`, 44 warnings, one more than on `origin/main` (43).
  - `prettier@3.9.6 --check` on all changed files: "All matched files use Prettier code style!".
  - The new scenario file type-checks with the backend's `tsc` (strict, NodeNext). The only errors were the missing `playwright-core` types, which every scenario file has here.
- **Automated test added or updated:**
  - `admission.test.ts`: "the limit error says when the hour resets".
  - `upload.test.ts`: "the hourly limit tells the agent when it resets and not to retry". "size and rate limits return only their known code" now also checks that nothing from the error's details (a `signed` value) reaches the result.
  - With `admission.ts` and `upload.ts` put back to `origin/main`, both new tests fail: `(fail) the limit error says when the hour resets`, `(fail) the hourly limit tells the agent when it resets and not to retry`, `11 pass`, `2 fail`.
  - e2e: "a rate-limited upload returns the reset time and the agent is told not to retry".
- **Not verified:**
  - The e2e scenario has not been run. This sandbox has docker and xvfb-run, but it is missing other parts of the suite: the root `node_modules` (`playwright-core`, and the root eslint plugins, so `scripts/` was not linted either), `pnpm`, the Electron binary in `apps/desktop/node_modules`, an `openab` binary, and the `mongo:8.0.32` and `rustfs/rustfs:1.0.0` images. I was asked not to install anything, so none of these were added. The "Desktop against a real backend" job on this PR is the first run.
  - Whether a real model obeys "Do not retry". The fixture agent does not read the description or the skill. The scenario checks only that the answer says it.
  - That the refused `local_upload` logs no 4xx line the suite would count as a backend failure. I expect none, because the 429 is caught inside `dispatchLocalUpload`, but this was not observed.

Fixes #ISSUE. Refs #3198

🤖 Generated with [Claude Code](https://claude.com/claude-code)
