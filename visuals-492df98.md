Visuals for 492df9823c9db4238eb311d7655d2476674a2a4b

Before: main (states 1, 2, 5, 6 at b2e7232; states 7 and 10 at 584e7b9). After: this PR's diff (states 1, 2, 5, 6 captured before the pick-order commit, which doesn't change them; the rest at 492df98's code). Fixture accounts, light theme, no backend.

| State | Before | After |
|---|---|---|
| 1. Fresh signup, no agent | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-before-signup-home.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-home.png) |
| 2. Typed, pressed Enter | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-before-signup-typed.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-typed.png) |
| 3. Clicked Connect your agent (existing setup) | n/a | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-setup.png) |
| 4. Back from setup: draft kept | n/a | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-draft-kept.png) |
| 5. Agent connected, admin, no GitHub | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-before-signup-ready-home.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-signup-ready-home.png) |
| 6. Invited editor, no agent | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-before-invitee-home.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/0fd037febd980dd80ec24838fc634fd22483d7a3/v/v-after-invitee-home.png) |
| 7. Only agent signed out | ![](https://raw.githubusercontent.com/jeun27/nuphos/1f952dd705f19e957b7b6890c5c9bca3c9abdd2c/v/v2-before-signup-signedout.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/1f952dd705f19e957b7b6890c5c9bca3c9abdd2c/v/v2-after-signup-signedout.png) |
| 8. Setup: Claude Code signs in | n/a | ![](https://raw.githubusercontent.com/jeun27/nuphos/1f952dd705f19e957b7b6890c5c9bca3c9abdd2c/v/v2-after-setup-connected.png) |
| 9. Setup done: Claude Code auto-selected, draft kept, Send on | n/a | ![](https://raw.githubusercontent.com/jeun27/nuphos/1f952dd705f19e957b7b6890c5c9bca3c9abdd2c/v/v2-after-setup-done-home.png) |
| 10. Claude Code here, OpenCode on another computer | ![](https://raw.githubusercontent.com/jeun27/nuphos/1f952dd705f19e957b7b6890c5c9bca3c9abdd2c/v/v2-before-signup-multi.png) | ![](https://raw.githubusercontent.com/jeun27/nuphos/1f952dd705f19e957b7b6890c5c9bca3c9abdd2c/v/v2-after-signup-multi.png) |

Notes: the "0" badges on the credential and computer buttons (states 1, 2, 5, before) are gone after. In 6, the "1" badge stays because the team has a GitHub credential to pick.
