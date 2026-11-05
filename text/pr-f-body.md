## What

On the Runtimes page, a **member** (not an administrator) looking at a signed-out team runtime gets a reason and nothing to act on:
- **Cloud runtime:** "Not signed in." and no button (`onSignIn` is only passed when `canEdit`).
- **Self-hosted runtime:** "Not signed in. **Sign in here**, or on the runtime's host:" plus a `docker exec … login` command. There's no button for "here", and the host command is for whoever runs the host.

Only an administrator can sign a team runtime in (`requireLoginRole`). The update notice already tells members to ask an admin; sign-in didn't.

**Fix.** `RuntimeSignIn` takes `memberOf` (the team) for a non-admin viewer and names the administrator to ask, using the same `adminName` the chat's sign-in card uses (the longest-standing administrator):
- "Not signed in. Ask {name} to sign it in.", or "Not signed in. Ask a workspace administrator to sign it in." until the members load.
- For a member, the self-hosted "Sign in here" copy and the host command are no longer shown.

Admins see exactly what they did before. The member list is fetched only for non-admins.

On this page there's no conversation to hold a sign-in request, so the in-app "Ask" (#1117, and #1585 in the composer) doesn't apply here. Naming the person is the action forward.

New locale keys, inserted in all 7 locales: "Not signed in. Ask {name} to sign it in." and "Not signed in. Ask a workspace administrator to sign it in."

Part of the runtime sign-in dead-end audit. It's independent of the other PRs in the series.

## Test

- **Reproduced** in a page-only harness of the real `RuntimeInstanceCard`. Fixtures: a cloud runtime "Team Claude" and a self-hosted "Office server", both signed out. The viewer is member Alex; the admin is Sam Lee.
  - **On main:** "Not signed in." and "Sign in here…", with no button.
  - **On this branch:** "Not signed in. Ask Sam Lee to sign it in." on both. The admin view is unchanged ("Sign in").
- `tsc -b --noEmit` is clean. ESLint has 0 errors. Prettier is clean. `i18n.test.ts` passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
