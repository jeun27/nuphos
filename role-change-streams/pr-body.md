## Summary

Part of #3197 (piece 1 of the split). Fixes #ISSUE.

`PATCH /teams/:teamId/members/:memberId` called `revokeTeamBoxStreams(teamId, memberId)` (`apps/backend/src/lib/agent/devices/box-access.ts`) whenever the new role was not Administrator. That closed every terminal, computer-use and chat stream the member had open on the team's cloud computers.

The call was added in #411. Back then `deviceAccess` took the team role and returned `manage` on every team Box for an Administrator, so a demoted admin really did lose access and closing their streams made sense. #1391 (one access model for computers) took the role out of `deviceAccess`. On main today, `deviceAccess` in `box-access.ts` decides access from the computer's owner (`deviceOwner`) and the team's grant (`managerIds`, `everyone`, `userIds`). Its doc comment says "Team roles confer nothing". `listAccessibleDevices` and `requireDeviceAccess` only use the role to check that the person is still a member (`role(...) !== null`). A role change therefore grants and removes nothing on a computer, and the revoke was a leftover: it closed streams the person was still allowed to have, and they could reconnect straight away.

This PR removes the call and its import from `apps/backend/src/routes/teams/management.ts`. Leaving the team and being removed are unchanged: both still close the person's streams through `revokeTeamMemberAccess` (`local-share-revoke.ts`), which calls `revokeTeamBoxStreams`.

Nothing visible changes, so there are no screenshots.

## How this was verified

- **Flow exercised:** the role-change route in a Hono app with the identity and agent-device store doubles. Two requests change a member's role, one to `EDITOR` and one to `VIEWER`. The test records every `listTeamBoxes(teamId)` lookup, which is the first thing `revokeTeamBoxStreams` does, and expects none.
- **Build and environment:** branch on upstream main 9b58fc7f, Linux, bun 1.3.13.
- **Result:** with the fix, `bun test src/routes/teams/management.test.ts` gives 8 pass, 0 fail. With `management.ts` put back to main's version, the new test fails:
  ```
  error: expect(received).toEqual(expected)
  - []
  + [
  +   "team-1",
  +   "team-1",
  + ]
  (fail) PATCH /members/:memberId > changing a role leaves what the person has open on the team’s computers alone
   7 pass
   1 fail
  ```
  `bun test src/lib/agent/devices/local-share-revoke.test.ts` (the leave/remove path): 3 pass, 0 fail. `bun run typecheck` (backend): exit 0. eslint on both files: 0 errors and 2 warnings that were already there (`require-await` on the test double, `max-lines-per-function` on `registerTeamManagementRoutes`, which is 3 lines shorter now). prettier 3.9.6 `--check`: clean.
- **Automated test added or updated:** `apps/backend/src/routes/teams/management.test.ts`, `PATCH /members/:memberId`.
- **Not verified:** I did not run this against a real backend with a live Box and an open stream. No real-backend e2e scenario covers role changes and streams. The only role change in `scripts/e2e` is `joinAsAdmin` in `binding-access-scenarios.ts`, which promotes a member to Administrator, and that path never called the revoke. I did not run the e2e suite for this PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
