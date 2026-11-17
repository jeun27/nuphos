The "Requests to use your computer" Inbox section and the phone waiting strip are dead UI

Since #1391 (one access model for computers), use of a teammate's computer no longer asks its owner to approve each conversation, so the backend never creates a new approval. The clients still carry the UI for it:

- Desktop: the Inbox polls for approvals, shows a "Requests to use your computer" section with Decline / Approve, counts them in the Inbox badge and sends an OS notification for each.
- iOS and Android: a conversation on a teammate's computer asks `share-approvals/mine` and can show a "Waiting for the owner of ..." strip.

Today this only shows up if old approval records are still stored (for example one left pending from before #1391): an owner then sees a request they cannot meaningfully act on, and the badge counts it.

Expected: the clients no longer show, count or notify about computer-use approvals. The backend routes and stores stay for released builds and go in step 3 of #1328.
