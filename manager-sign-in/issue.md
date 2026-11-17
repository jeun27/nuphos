Managers of a computer are told to ask its owner to sign its agents in

Since #2431, the people who manage a computer may sign its agents in, the same as its owner, and someone who only uses it may not. The Desktop app and "Ask to sign in" were not updated:

- A manager of a teammate's computer opens a Task whose agent on that computer needs signing in. The card says "Ask <owner> to sign in" instead of offering Sign in, although the backend would let them sign it in.
- Someone who only uses the computer presses "Ask to sign in". Only the owner is asked. The computer's managers, who could sign it in, get no push and no Inbox entry.

Expected: managers get the Sign in action (also before the agent shows up in the list), "Ask to sign in" reaches the owner and the managers, owner first, and a manager who asks is told they can sign the agent in themselves.

Part of #3197.
