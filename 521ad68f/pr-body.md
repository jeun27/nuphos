## Summary

Answering an Inbox question while its agent was busy sent the choice as a steer and dropped the question id. Each click became a plain user message ("Keep it public" ×3), the question stayed open, the card stayed clickable, and the Inbox badge stayed at 1.

**Root cause.** The Inbox reader card (`views/inbox/DecisionCards.tsx`) answers through the hidden panel composer. While a turn runs, `routeSend` turns any send into a steer and drops `decisionReplyTo`. That skipped `answeringInbox` (#1218), so the card never left. Nothing on the backend stopped a second answer either.

## Changes

- **Desktop routing.** A reply from a surface that only answers questions (the Inbox and the input queue, i.e. any panel without the main chat's "Replying to" chip) waits behind the running turn with its question and never steers. The main chat chip steers as before (`sendRouting.test.ts` keeps that).
- **Desktop feedback.** The card leaves the Inbox and the badge clears at once, as in #1218. An answer queued behind a running turn shows a toast: "Answer queued. The agent will see it after its current step." If the send fails, the card comes back with "Could not send your answer". A repeated click before the send goes out sends nothing.
- **Backend: one answer per question** (@yuaanlin confirmed the approach, using the queue-derived option). A question counts as answered while the session queue holds a message whose `chat.decisionReplyTo` is its id (`answeringIds`). The list and detail serializers drop those questions, so the Inbox and the badge stop asking on every device while the answer waits behind a running turn. A second answer from another message gets **409 `decision_already_answered`**, and so does an answer to a question that is already answered or dismissed. Resending the same message id still works. Nothing is stored, so a take-back, a failed enqueue or a session reset leaves the question answerable again. Steering a queued answer into the running turn resolves its question.
- Locale keys are insert-only, 3 per locale, placed next to "Could not send your message".

The hold is server-side, on the decision record, so another device's badge agrees as well.

## Not changed

- iOS and Android don't have this gap. They show `request_user_decision` as a plain "Question" row with no option buttons and never send `decisionReplyTo`.
- In the main chat, the in-transcript `ChoiceCard` is already disabled while a turn runs.
- Known window: two different answers that arrive at the same moment can both be admitted, because the 409 check reads the queue. The Desktop guard and the card leaving at once make this hard to hit.

## Tests

- `session-queue-turn.test.ts`: a repeated click or a second option after the first is refused with 409, and only one message is queued. Answering a resolved question is refused. An unlisted question is left alone.
- `session-queue-turn.test.ts`: an answer that is taken back leaves its question answerable.
- `transcript-input-requests.test.ts`: a question a queued message answers is not listed, so the badge clears.
- `dispatchTurn.test.ts`: an answer to a busy agent clears the badge at once, says it is queued, and stays cleared under a listing that holds it.
- `sendRouting.test.ts`: an Inbox answer to a running turn is not steered and keeps its question.
- Run locally: desktop `src/**/*.test.ts` 1934/1934 and `tsc` clean. Backend `src/routes/agent` + `src/lib/agent`: 2137 pass, 2 fail. Both failures (`nuphos-plan semantic scripts`, `nuphos-api helper origin binding`) also fail on clean main in this sandbox. Import-cycle check ok.

## Visuals

See the newest "Visuals for <head>" comment, which has the full set.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
