## Summary

Part of #3198 (split out as asked there). This is the failed-tool-call marking in the Desktop transcript only. The rate-limit message and the upload-slot refund are separate PRs.

**Needs maintainer visual approval.** This is a new design.

Today a finished tool call that failed looks like one that worked. Tools like `local_upload` report a failure as a normal result (`{ error: 'file_not_found' }`), not as a thrown call. So the row has no mark, and once the reply is done the call folds into "Activity" with the routine work.

With this change:

- A finished call that threw (`output-error`) or returned `isError: true` ends in a red "Failed".
- A call that returned `{ error: '<reason>' }` ends in "Failed: <reason>". An error code in snake_case reads as words (`file_not_found` → "file not found"). This works for any code; nothing here is specific to file transfer. A sentence is shown as it is. `{ ok: true, error }` stays a success, since some tools use that for a note.
- A closed run of several calls adds "· N failed" after "· N calls", counted by the same rule as each row.
- A call that returned an error stays out of the Activity fold.
- The reason gives up width before the label: it has a flex basis of 0, so a long reason truncates first.
- Command exit codes are left to the terminal view and are not marked on the row.
- A finished turn still folds all its work behind "Worked for Xs", failed calls included, as before. The fold header does not show a failure count; the marks are visible once the fold is opened. (Showing "· N failed" on that header would need `foldedTurnLayout` and `AssistantMessage.tsx`, which is at its 300-line limit, to change. That is left out of this PR.)

A tool's result reaches the transcript in one of three shapes, and the returned error is read from each:

- an object (`{ error: 'file_not_found' }`), when the runtime passes the MCP result with its `structuredContent`;
- MCP text content, the shape Claude Code delivers. It reports an MCP call's content blocks as `rawOutput`, so the part's output is `[{ type: 'text', text: '{\n  "error": "file_not_found"\n}' }]`, the backend's JSON text inside;
- JSON text on its own.

These are read by `toolResultRecord`, the reader `threadBadges.ts` already used for thread receipts. It is moved unchanged into its own file, and both now import it. Text that is not JSON, JSON without an `error` key, and an `error` that is null, empty or blank are not failures. For `bash` and `local_exec`, text output is the program's stdout, so JSON a command printed (`curl` of an API error) is not read as the tool's error. Their failures stay with the exit code, as before.

Code:

- `toolFailure` and `failedCallCount` in `activity.ts`; `failedOutput` now also counts a returned error.
- `toolResultRecord.ts`.
- `ToolFailureLabel` in `ToolPartView.tsx`, used by `ToolRunView.tsx`.
- One new string, `{n} failed`, in the 7 locale files.

## How this was verified

- **Flow exercised:** The transcript components rendered in a Vite harness with fixture data, before (origin/main 9b58fc7f) and after, same viewport (1100x720, scale 2), light theme. This shows only what the components draw for those outputs. It does not show a real failed call in the app.

  1. Five calls in one reply, run opened: a successful `local_exec`, a call that threw, `local_upload` returning `{ error: 'file_not_found' }`, `local_upload` returning `{ error: 'file_transfer_rate_limited', … }`, and `local_upload` returning a plain-text sentence.

     Before: https://raw.githubusercontent.com/jeun27/nuphos/fee2c8cd7e4d0f82002a01811410d86a629ec862/failed-tool-calls/before/01-failed-calls.png
     After: https://raw.githubusercontent.com/jeun27/nuphos/fee2c8cd7e4d0f82002a01811410d86a629ec862/failed-tool-calls/after/01-failed-calls.png

  2. The same reply in a 420px pane. The labels and times stay whole and the red reason truncates.

     Before: https://raw.githubusercontent.com/jeun27/nuphos/fee2c8cd7e4d0f82002a01811410d86a629ec862/failed-tool-calls/before/02-failed-calls-narrow.png
     After: https://raw.githubusercontent.com/jeun27/nuphos/fee2c8cd7e4d0f82002a01811410d86a629ec862/failed-tool-calls/after/02-failed-calls-narrow.png

  3. Separate work replies in a turn, one of them an upload returning `{ error: 'file_not_found' }`. Before, everything folds into one "Activity". After, the failed upload stays out of the fold.

     Before: https://raw.githubusercontent.com/jeun27/nuphos/fee2c8cd7e4d0f82002a01811410d86a629ec862/failed-tool-calls/before/03-error-result-not-folded.png
     After: https://raw.githubusercontent.com/jeun27/nuphos/fee2c8cd7e4d0f82002a01811410d86a629ec862/failed-tool-calls/after/03-error-result-not-folded.png

- **Real Desktop capture:** added as a real-backend e2e scenario, "an upload of a file that is not there is marked failed in the transcript" (`scripts/e2e/computer-scenarios.ts`).
  - The fixture agent calls `local_upload` on a path that does not exist on the app's computer. It reports the call to the app the way Claude Code does: a new `E2E_SHOWN` marker, handled in `callNamed` with fixture-hop's `shown`, sends the MCP text content as `rawOutput`. So the row is the real one.
  - The scenario opens the finished turn's "Worked for" fold and waits for the `[data-tool-failed]` element reading "Failed: file not found". It then saves `failed-upload-row.png` (the row) and `failed-upload.png` (the window). If that element does not appear, the scenario fails with the opened fold's text, the outerHTML of its rows, and the stored `local_upload` part as the backend returns it.
  - The "Desktop against a real backend" job runs it on this PR and uploads both captures in its `e2e` artifact.
  - **The scenario has not passed yet.**
    - Run 44028779910 (first push) looked for the row without opening the fold. The fold renders its work only once opened.
    - Run 44162373117 opened the fold. Its last window shows the row as "Upload a file that is not there 0s", with no red mark. So the app did not mark the call there; the selector was not the problem.
  - **What is known about that call:**
    - The agent log shows `local_upload` answering `{"content":[{"type":"text","text":"{\n  \"error\": \"file_not_found\"\n}"}],"structuredContent":{"error":"file_not_found"},…}`.
    - openab relays agent `tool_call_update`s verbatim.
    - Replaying the fixture's `tool_call` and that `rawOutput` through the backend's `handlePreviewToolUpdate` gives a `local_upload` part whose output is that text-content array.
    - The real `<Conversation>` rendered in the harness with exactly that part shows "Failed: file not found" once the fold is opened.
  - So the part the app showed in CI differs from that, in a way the run's logs do not record. The scenario's failure message now prints it, so the next run shows what reached the app.
- **Build and environment:** Linux container, Node 22, headless Chromium for the harness, rebased on origin/main 43fac134.
- **Result:** The harness shows the marks above. `activity.test.ts` 10/10 pass, plus `threadBadges`, `toolRuns`, `turnFold`, `repeatedFailures`, `railTurns`, `i18n` and `sourceText` tests. `tsc -b --noEmit` was clean before the last rebase. After it, the only errors are `Cannot find module 'undici'` in `electron/backend-socket.ts`: a dependency main added in #3348, missing from the local install used here. ESLint has 0 errors, both on the Desktop files and with the root config on the e2e files; their warnings (2 in `ToolPartView.tsx`, 3 in `acp-fixture.mjs`) are the same as on main. Prettier is clean.
- **Automated test added or updated:** `activity.test.ts` has six new tests and three new retained cases.
  - Two tests cover the result shapes: Claude Code's MCP text content and JSON text, and the cases that must not be marked (prose that mentions "error", non-JSON text blocks, JSON without `error`, `error` null or empty or blank, `{ ok: true, error }`, an exit code in JSON text, an image block).
  - One test covers JSON printed by a shell command.
  - Against origin/main's `activity.ts` (with the two new functions stubbed so it loads), 5 of the 10 fail: the retained cases (expected 0, actual 1), the three marking tests (expected '' / 3 / 'file not found', actual null / 0 / null), and the text-results test (expected '', actual null).
  - Against the first version of this change, which read objects only, 2 fail: the retained cases, and "a returned error is read from JSON text and from MCP text content too" (expected 'file not found', actual null).

  Plus the e2e scenario above.
- **Not verified:**
  - The e2e scenario has not passed yet (see above); CI runs it on this PR. It could not be run here: Chromium in this container exits shortly after the app opens its window.
  - `scripts/e2e/computer-scenarios.ts` was parsed, linted and formatted but not type-checked (no tsconfig covers `scripts/e2e`).
  - `scripts/check-import-cycles.mjs` was not run (no `madge` here). The one new import, `fixture-mcp.mjs` → `fixture-hop.mjs`, cannot form a cycle: `fixture-hop.mjs` imports only `node:crypto`.
  - Codex and other runtimes were not tried in the app.
  - Dark theme and other locales were not captured.

Fixes #ISSUE. Refs #3198

🤖 Generated with [Claude Code](https://claude.com/claude-code)
