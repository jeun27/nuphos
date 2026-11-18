Desktop Inbox: dismiss every question at once

Today there is no way to clear the Inbox at once. #3236 (from #3231) replaces the Inbox's Skip with per-question **Snooze** and **Dismiss**: Dismiss closes one question, waits out the Inbox's 5 s Undo window, and then tells the Bot or Task that asked. With many open questions, clearing the Inbox still means one Dismiss per question.

## Proposal: "Dismiss all"

- One **Dismiss all** button in the Inbox page's header, beside the search and its count. It shows when the Inbox shows two or more questions.
- It covers the questions the Inbox shows now: not snoozed ones, and only those a search matches.
- It asks first with the standard confirmation: "Dismiss N questions?" and "Each Bot or Task that asked is told you won't answer."
- It uses #3236's dismissal and its Undo window. All the questions leave at once, the toast "Dismissed N questions" offers Undo for 5 s, and one Undo brings them all back with nothing sent.
- Once the window passes, each question is dismissed through the existing `POST …/decisions/:id/resolve` with `resolution: "dismissed"`, so each asker is told as with a single Dismiss. No new endpoint.
- If some are refused (for example, answered meanwhile in their chat), those stay in the list and the toast says how many could not be dismissed.
- There is no reason field. #3236's reason field belongs to the card, so it cannot be reused inside a confirmation as it is.

Refs #3231, #3236.
