Sharing a computer takes a trip through its menu, leaves no record, and the person it was shared with is never told

Today, in Team settings > Computers and runtimes:
- To share a computer you manage, you open its "⋯" menu and pick "Manage access…". Sharing is the most common reason to open that menu, but the row has no button for it.
- The Share dialog of a local computer and the "Who can use" dialog of a cloud computer only show who has access now. There is no way to see who changed it, when, or how (from the dialog, from a chat invite, by someone leaving or being removed from the team). The backend already records every change (`GET /agent/devices/:id/access-audit`), but nothing in the app reads it, and the route leaves out that a removed member's cloud computer was handed to a new owner.
- When a teammate shares a computer with you, or makes you a manager of one, nothing tells you. You find out only if you happen to open the agent picker or the Computers page.

Expected:
- A "Share" button on each computer row for people who manage it (not for people with Use only), opening the same dialog.
- An "Access history" section in both dialogs: who changed access, when, how, and what changed, including "{name} now owns it" when a cloud computer changed owner.
- A notice when a computer is shared with you or you are made its manager: a toast with "Open" when the app is in front, a system notification otherwise.
