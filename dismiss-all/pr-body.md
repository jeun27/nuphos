> **Stacked on #3236.** This PR targets #3236's branch `feat/inbox-snooze-dismiss-desktop`, so its diff is only this PR's one commit. Once #3236 merges, GitHub moves it to `main`, and I'll rebase it there.

## Summary

The Inbox had no way to clear itself. #3236 adds per-question Snooze and Dismiss, so clearing N questions still takes N Dismisses. This adds **Dismiss all**.

- **Where:** the Inbox page's header, in the toolbar's right slot beside the search and its "N items" count. That row already holds the page's list-level controls, and it is where other pages put theirs, such as the Audit log's "Export all". The sidebar's Inbox header is only a title. It is a standard secondary `Button` with the same X icon as Dismiss, and it shows when the Inbox shows two or more questions. With one, the card's own Dismiss, which takes a reason, is right there.
- **What it clears:** the questions the Inbox shows now. Snoozed ones are already out of the list, and with a search only the matches are cleared. The search filter moved into `shownQuestions` so it can be tested.
- **Confirmation:** the standard `ConfirmDialog`, "Dismiss N questions?" and "Each Bot or Task that asked is told you won't answer.", confirm "Dismiss all". There is no reason field. #3236's reason field is the card's `AnswerField`, with its own send button, so it cannot be reused inside a confirmation as it is. While the dialog is open, the Inbox's keys (1–9 to answer, ↑ ↓) rest, so a key cannot answer the question behind it.
- **Same dismissal, same Undo:** `holdAnswer` is now built on a new `holdReplies(ids, send)`, which holds any set of questions under the Inbox's one 5 s Undo window. `holdDismissals` uses it, so every question leaves at once and the toast "Dismissed N questions" offers Undo. One Undo brings them all back with nothing sent. A held single answer is sent, not lost, when "Dismiss all" follows it, as when one answer follows another.
- **Backend:** none. Once the window passes, each question goes through #3236's `dismissDecision` → `POST …/decisions/:id/resolve {resolution: "dismissed"}`, so each asker is told as with a single Dismiss. Concurrent calls are safe: each `resolveInputRequest` removes only its own entry, and the wake turns go through `claimAgentRunOrEnqueue`, which queues a second wake of the same conversation instead of dropping it.
- **Partial failure:** questions that are refused come back in the list, through the same `answeringInbox` path as a single Dismiss. The toast says "Could not dismiss N questions", or for one, "Could not dismiss question" with why.
- Five new strings in all 7 locales. None of them says "agent".

**1. The Inbox with three questions.** Before, there is no way to clear the list. After, "Dismiss all" sits beside the search and count.

| Before | After |
|---|---|
| https://raw.githubusercontent.com/jeun27/nuphos/f040013bcc86e1782b4c51fbd89480c546160413/dismiss-all/before/01-inbox-three-questions.png | https://raw.githubusercontent.com/jeun27/nuphos/f040013bcc86e1782b4c51fbd89480c546160413/dismiss-all/after/01-inbox-three-questions.png |

**2. The confirmation.**

https://raw.githubusercontent.com/jeun27/nuphos/f040013bcc86e1782b4c51fbd89480c546160413/dismiss-all/after/02-dismiss-all-confirm.png

**3. Right after confirming.** All three questions leave at once, the toast offers Undo, and nothing has been sent yet.

https://raw.githubusercontent.com/jeun27/nuphos/f040013bcc86e1782b4c51fbd89480c546160413/dismiss-all/after/03-after-dismiss-all-undo-toast.png

**4. Once the Undo window passes.** Each question was dismissed through the resolve route, and the Inbox is empty.

https://raw.githubusercontent.com/jeun27/nuphos/f040013bcc86e1782b4c51fbd89480c546160413/dismiss-all/after/04-inbox-empty-after.png

**5. After Undo.** All three questions are back and nothing was sent.

https://raw.githubusercontent.com/jeun27/nuphos/f040013bcc86e1782b4c51fbd89480c546160413/dismiss-all/after/05-undo-brings-all-back.png

## How this was verified

- **Flow exercised:** a screenshot harness (Vite, headless Chromium, light theme) renders the real `Toolbar`, `InboxView` and `SidebarInboxPage` from each tree, with fixture data: three questions from three Tasks. The flow is to open "Dismiss all", confirm, then either wait out the window or press Undo. The harness checks that no resolve call is made before the window ends or after Undo, and that all three are resolved after it.
- **Build and environment:** Linux sandbox, Node 22. Desktop `tsc -b --noEmit` is clean. ESLint on the changed desktop files and on `scripts/e2e` shows 0 errors (only warnings that were already there). Prettier 3.9.6 `--check` passes on the changed files.
- **Result:** as in the captures above. Desktop unit tests: 3288 pass, 1 fails, 4 skipped. The one failure is `electron/local-terminal.test.ts`, which cannot load node-pty's native `pty.node` on linux-x64 here. It fails the same way on #3236's head.
- **Automated test added or updated:**
  - `src/views/inbox/dismissAll.test.ts` covers:
    - which questions are cleared: not snoozed ones, not another person's, and only the matches of a search
    - that they all leave at once and one Undo brings them all back unsent
    - that once the window passes each one is resolved as `dismissed`
    - partial failure: the refused question is back, and the result says which one and why
    - that a held answer is sent when "Dismiss all" follows it
  - It fails on #3236's head, where `shownQuestions` and `dismissAll.ts` do not exist, and passes here.
  - e2e (`scripts/e2e/inbox-dismiss-all-scenario.ts`, registered in `questionScenarios`): two Tasks ask, and the Inbox search keeps the action to those two. The confirmation must say "Dismiss 2 questions?". Undo inside the window keeps both open, and neither Task is told. Confirming again closes both, and each Task's session logs the dismissal notice. It saves `inbox-dismiss-all-light.png` and `inbox-dismiss-all-confirm-light.png`.
- **Not verified:**
  - The real-backend e2e suite cannot run in this sandbox, so the new scenario has not run yet. CI's "Desktop against a real backend" job is its first run.
  - The scenario finds its two questions by searching for "dismiss-all", which relies on the Task titles still starting from the first message, as `fallbackTitle` sets them at insert.
  - I did not open the packaged Electron app. The captures come from the harness, not from the real app against a backend.
  - `pnpm test:ui` (bun component tests) was not run. This change touches none of the components it covers.
  - Locales other than English were translated by me and have not been reviewed by a native speaker.

Fixes #ISSUE

🤖 Generated with [Claude Code](https://claude.com/claude-code)
