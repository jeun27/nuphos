Updated for each point, rebased on the latest main.

1. **Wrong name.** The notice no longer names anyone. It now reads "{computer} is now shared with you" and "You can now manage {computer}". The bodies are unchanged. I looked at naming the person who made the change, but the device list doesn't carry it. The access audit does, but only managers can read it, and a person given Use can't, so the name couldn't be shown reliably. The wording moved into `noticeWords` in `computerAccessNotice.ts`, with a test showing that a computer owned by Maya is announced without her name. The two old strings are gone from all 7 locales, and the two new ones are translated.

2. **Caps and bound.** `notifyComputerShared` now refuses a key over 256 characters (`RangeError`) and cuts the title to 200 characters and the body to 400. `announcedShares` keeps at most the latest 500 keys, the same way `announcedMentions` is bounded. Both are tested in `notify.test.ts`, and both tests fail without the change.

3. **Failed notify.** When the IPC call rejects, that computer is taken off the saved seen list (`forgetSeen`), so the next look announces it again. This is tested in `computerAccessNotice.test.ts`.

4. **Focused window after an unfocused one claimed the key.** I left this as it is. The seen list is in localStorage, which every window of the app shares. Once the unfocused window has written it, the focused window's next look finds nothing new and never asks main. So the case only happens when two looks race within the same moment, and even then the person gets one notice: the system notification the first window raised. Showing a toast in the focused window as well would make two notices. Moving the toast there instead would need a new main-to-renderer channel and a listener in every window. That window may also be showing another team, so its Open would go to the wrong place. That isn't a small change, and I'd rather not grow this PR with it.

5. **Test targets.** The new `.test.ts` files run in the Desktop `test` script: `"test": "node --experimental-strip-types --experimental-test-module-mocks --test \"electron/**/*.test.ts\" \"src/**/*.test.ts\" \"local-runtime/*.test.mjs\""`. That covers `notify.test.ts`, `accessChanges.test.ts` and `computerAccessNotice.test.ts`. `BoxRow.test.tsx` and `AccessHistory.test.tsx` are in `test:ui`.

6. **Evidence on the real app.** I added a real-backend e2e scenario, "a computer a teammate shares with you is announced once, in the app" (`scripts/e2e/share-notice-scenarios.ts`, in `computerScenarios`):
   - A second person signs in and joins the team, connects a stand-in computer with their own sign-in, and shares it with the app's user.
   - To avoid waiting a minute, the scenario triggers the hook's next look with a `visibilitychange` event, which the hook already listens to.
   - It waits for "Teammate laptop is now shared with you" and saves `computer-shared-toast.png`.
   - It then looks again and checks that no second notice appears.

   I couldn't run the suite locally, so please rely on the "Desktop against a real backend" job on this PR. The scenario assumes the window is focused under Playwright. If it isn't, main raises a system notification instead and the scenario fails on the missing toast. That would be worth knowing too.
