## Summary

Part of #3198 (split out as asked there). This is only the refund of a failed upload's transfer slot, with the finalize/refund race closed. The rate-limit message and the failed-tool-call marking are separate PRs. This one is built on `origin/main` and does not need either of them.

Each team can start 60 file transfers (or 5 GiB) per UTC hour, and a transfer takes its slot when it is created. A `local_upload` whose file never reaches storage still uses that slot. For example, the computer cannot read the file, or the PUT fails. An agent that retries a failing upload can use up the team's hour on transfers that never delivered anything.

With this change, an upload from a computer whose file never reached storage gives its slot and bytes back, once:

- `admitFileTransfer` returns what it took (`{ key, bytes }`), and `createTransfer` stores it on the group as `admission`. `refundFileTransfer` gives it back to the hour that admitted it. Its filter keeps the counters from going below zero.
- `releaseTransfer` (`file-transfer/release.ts`) claims the group by setting `admission.releasedAt`, and refunds only if that claim matched. The claim is filtered on `status` not being `ready`, `admission` existing, and `releasedAt` not being set. So a delivered group keeps its slot, a group from before this change has nothing to give back, and a group is refunded at most once.
- `dispatchLocalUpload` releases in three cases:
  - a transfer nobody confirmed, after storage has been checked and the file is not there;
  - a transfer the computer confirmed but storage did not have;
  - a transfer created after the caller had already been answered with an error.

  If the storage check itself fails, the slot is kept. A failed release is logged (`agent.local_upload.release_failed`) and never reaches the caller. The release is only called from `devices/upload.ts`, where the upload URLs went only to that computer's private stream. It is not on a route and not called from finalize, since anyone holding a presigned PUT could still upload after a refund.

**The race (review point 4 on #3198).** In the full change, a finalize that had loaded the group just before the refund recorded `releasedAt` could still mark it ready. The file was then delivered after its slot was refunded. The guard at the top of `finalizeTransfer` only covered a finalize that started after the release. This PR closes the race at the write:

- `finalizeTransfer` first decides each item from storage without writing it. It then writes the group status filtered on `admission.releasedAt` not existing, and checks `matchedCount`. `modifiedCount` would be 0 when the status did not change.
- Items are written as ready only if that group write matched. Otherwise they are written as failed, and the view shows them failed.
- On the other side, the release claim already refuses a group whose status is `ready` in the same filtered write. Both paths go through one atomic update of the group document, so only one of them can win: either the file is delivered and keeps its slot, or the slot is refunded and the file is never delivered.

One ordering is new: the group status is now written before its items. A reader polling between the two writes can see a ready group whose item is still pending, for one write. `transfer-pull.sh` keeps waiting while any `"status": "pending"` is in the response, so it waits for the item. The Desktop's download lists show only groups with a ready item.

Real-backend e2e: a new scenario, "a failed upload gives its slot back once", in `scripts/e2e/transfer-refund-scenarios.ts`, listed at the end of `computerScenarios`. It writes a file on the app's computer with mode 000. The computer can stat it, so the transfer is admitted, but it cannot read it, so the bytes never leave. The fixture agent calls `local_upload` on it. The scenario then waits until the group is `failed` with `admission.releasedAt` set in the suite's MongoDB, and checks that the hour's counter is back where it was before the upload. Then it finalizes the group again through the API, and checks that the counter and the group's status did not change. It does not import from `computer-scenarios.ts`, so the two files do not import each other.

## How this was verified

- **Flow exercised:** unit tests only. The real-backend scenario was written but not run here (see "Not verified").
- **Build and environment:** Linux sandbox, branch on `origin/main` 9b58fc7f, backend tests with bun.
- **Result:**
  - `bun test src/lib/file-transfer/ src/lib/agent/devices/upload.test.ts`: `34 pass`, `0 fail`, "Ran 34 tests across 6 files".
  - `bun run typecheck` (backend): clean.
  - `eslint` on the ten backend files: `0 errors`, warnings only.
  - `prettier@3.9.6 --check` on all changed files: "All matched files use Prettier code style!".
  - The new scenario file type-checks with the backend's `tsc` (strict, NodeNext). The only errors were the missing `playwright-core` types, which every scenario file has here.
- **Automated test added or updated:**
  - `release-race.test.ts` (new) runs the real `finalizeTransfer` and `releaseTransfer` against one in-memory group. Its double applies the filters and reports `matchedCount`. It covers both orderings:
    - "a finalize that loaded the group before its release never delivers the file": the release claims while finalize is checking storage.
    - "a release that claims once finalize has marked the file ready gives nothing back": the release runs at finalize's first "ready" write.

    Against the full change's `service.ts` (ftf-full), both fail: `Expected: not "ready"` and `Expected: 0, Received: 1` (refunds), `0 pass`, `2 fail`. With this PR both pass.
  - `release.test.ts` (from the full change, plus one test): once per group, concurrent releases refund once, a ready group and a group without `admission` keep their slot, and a group marked ready after the release read it keeps its slot. The last one fails if the `status` filter is taken out of the claim: `(fail) a group marked ready after the release read it keeps its slot`.
  - `admission.test.ts`: a refund gives back one transfer and its bytes and never goes below zero, and a refund frees a slot at the limit.
  - `service.test.ts`: a released group stays undelivered when its file lands later. Its group double now reports `matchedCount` as MongoDB would, matching unless the filter excludes a released group. Against `origin/main`'s `service.ts`: `(fail) a group whose slot was given back stays undelivered when its file lands later`.
  - `upload.test.ts`:
    - a file that never arrives gives the slot back once;
    - a file that did arrive keeps it although the computer never confirmed it;
    - a failed storage check keeps it;
    - a confirmation that storage did not have the file gives it back once;
    - a transfer created after the caller timed out gives it back;
    - an upload refused before a transfer exists has nothing to give back;
    - the 6 MiB round trip keeps its slot.

    Against `origin/main`'s `upload.ts`, 3 fail: "an upload whose file never arrives gives the slot back once", "a confirmation that storage did not have the file gives the slot back once", "a transfer created after the caller timed out is checked and gives its slot back".
  - e2e: "a failed upload gives its slot back once".
- **Not verified:**
  - The e2e scenario has not been run. This sandbox has docker and xvfb-run, but it is missing other parts of the suite: the root `node_modules` (`playwright-core`, and the root eslint plugins, so `scripts/` was not linted either), `pnpm`, the Electron binary in `apps/desktop/node_modules`, an `openab` binary, and the `mongo:8.0.32` and `rustfs/rustfs:1.0.0` images. I was asked not to install anything, so none of these were added. The "Desktop against a real backend" job on this PR is the first run.
  - The scenario relies on a mode-000 file being unreadable to the app, so it would not fail the upload if the suite ran as root. CI runs as a normal user.
  - The race against a real MongoDB. It is covered only by the in-memory double, which models the two filters.

Fixes #ISSUE. Refs #3198

🤖 Generated with [Claude Code](https://claude.com/claude-code)
