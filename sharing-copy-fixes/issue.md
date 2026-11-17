Sharing copy says the wrong thing, and destructive confirms all say "Delete"

What happens today:

- Settings > Local runtime, both agent cards and Local exec say only your own agents can use this computer ("for your own agents only", "Nobody else can use it.", "Only your own agents can use it."). Since #730 and #1391, teammates you share the computer with run on its agents with your sign-in, and since #2431 those who manage it can use local exec.
- `docs/shared-computers.md` says Use includes commands, terminals, file operations, browser control and runtime sign-in. Since #2431 those are Manage only.
- When a chat's agent is on a teammate's computer that is no longer shared with you, the composer banner says "{name} is no longer available." and nothing about why. The banner is one line that truncates, so a longer reason would be cut off in a narrow pane.
- Every destructive confirm through the context menu has a button labelled "Delete", including "Remove from team" and "Cancel invite" (where "Cancel invite" next to the dialog's own "Cancel" would be confusing anyway).
- The "Remove from team" and "Leave workspace" confirms do not say that the person's shared computers stop being shared (so teammates' chats on them stop) and their cloud computers in the team go to the owner, which is what the backend does.

Expected: the Settings lines and the help page match what Use and Manage grant; the banner says the agent was removed or its computer is no longer shared, and wraps; destructive confirm buttons name the action ("Remove from team", "Withdraw invite"); the remove and leave confirms say what else goes.

Part of #3197.
