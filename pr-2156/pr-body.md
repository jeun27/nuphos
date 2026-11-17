## Summary

Clicking the update button restarts Nuphos at once, and a restart stops Bots and tasks running on this computer mid-reply. This PR asks first, and makes the button open into a labelled pill on hover. Rebuilt on current `main` (the old branch was ~700 commits behind and the footer had been redesigned since).

- **Update button beside Help.** When an update is ready, a round update button sits between **Connectors** and **Help**. It no longer replaces Help, so Help, What's new and Keyboard shortcuts stay reachable while an update waits. It is the standard `Button` (`primary`, `sm`, round), the same component and height as the Connectors pill next to it.
- **Pill on hover.** On hover and keyboard focus it opens into **↓ Update**. The label animates with `grid-template-columns` 0fr→1fr, so it fits any language. It grows to the left over Connectors instead of pushing it, so the footer row never moves. While the pill is open, by hover or keyboard focus, the Connectors label and logos fade out over the same 200 ms, so the pill sits on a plain Connectors shape and no text shows half-covered. This is CSS only (`group-has-[…]` on the footer row). Both animations are off under `prefers-reduced-motion`.
- **Confirmation.** The pill and the help menu's **Restart to update to {version}** row both open the standard `ConfirmDialog`: **Update ready**, "Restart to finish installing Nuphos {version}. Bots and tasks on this computer stop, so replies still running there are cut off.", **Not now** / **Update**. **Update** runs the existing `updaterInstall`. There is no custom dialog file.
- **Download percent.** Since #2505 a restart downloads nothing, so the percent now shows the one download left that you can see: a newer release replacing the update already on offer. On `main` the button disappears until the new one is ready. Now it stays, disabled, with the percent, and the menu row reads **Downloading Nuphos {version}…**. A first download still shows nothing, as on `main`.
- **Room in the footer.** The Connectors pill hides its three decorative logo chips when it is narrower than they need (a container query on the button). That way its label still fits beside the update button. With no update it looks as it does now.

Renderer only. No main-process updater or quit changes. Two new strings, in all 7 locales. The dialog copy keeps the meaning that was approved. "Agents" is now "Bots and tasks", because of the product-word rule from #3250.

### Before / after

Light theme. Captured from the real `SidebarFooter`, `SidebarHelpMenu`, `SidebarPageTabs` and `ConfirmDialog` in a Vite harness with a stubbed updater (fake version 0.126.0, placeholder user "Alex"). Before = current `main` (0fcd14d3).

| State | Before (`main`) | After |
|---|---|---|
| Update ready | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/before/01-idle.png | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/01-idle.png |
| Hover | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/before/02-hover.png | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/02-hover.png |
| Newer release downloading in place of the offer | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/before/03-downloading.png | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/03-downloading.png |
| Keyboard focus on the pill | (no pill) | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/08-keyboard-focus.png |
| Help menu | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/before/04-help-menu.png | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/04-help-menu.png |
| Click **Restart to update** | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/before/05-dialog.png | https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/05-dialog.png |

Before: there is no pill. The update button replaces Help and opens the help menu, and the menu row restarts at once with no dialog (the harness recorded one `updaterInstall` call). During a replacement download the button is gone.

Hover → click → dialog (after):

https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/07-hover-click-dialog.gif

https://raw.githubusercontent.com/jeun27/nuphos/e1683a33d5a417befcb6c8c6b63a19bec129fb65/pr-2156/after/07-hover-click-dialog-strip.png

## How this was verified

- **Flow exercised:** In the harness: hovered the update button (the pill opens and the Connectors content's computed opacity is 0), tabbed onto it from Connectors (same result through `:focus-visible`), clicked it (the dialog opens, and `updaterInstall` has not been called). **Not now** closes the dialog without installing. Clicked again and pressed **Update**: exactly one `updaterInstall` call. Did the same from the help menu row: the same dialog opens and nothing is installed until **Update**. Pushed a `downloading` state after `ready`: the button stays, disabled, with 41%, and the menu row shows the download. On `main`, the same menu click calls `updaterInstall` immediately.
- **Build and environment:** Linux sandbox, Vite dev server, headless Chromium 2x, light theme, reduced motion for the stills (motion on for the GIF). This is not the packaged Electron app.
- **Result:** As in the captures above.
- **Automated test added or updated:** `src/components/readyUpdate.test.ts` covers which updater states offer an update and when the percent shows. Other checks: `tsc -b --noEmit` clean. ESLint clean on the changed files; this also fixes the two import-order warnings `help-menu.tsx` had on `main`. Prettier clean. i18n tests and `primitiveGuard.test.ts` pass. Full desktop `node --test`: 3281 pass, 1 fail. The failure is `electron/local-terminal.test.ts`: `node-pty` has no linux-x64 build in the sandbox, and it is unrelated.
- **Not verified:**
  - Not run in the packaged app or on macOS or Windows, so not a real `quitAndInstall` restart. Not checked whether an interrupted turn resumes or an unsent draft survives, and the dialog claims neither.
  - The replacement-download case was driven by a stubbed updater event, not by a real second release.
  - The dark theme was not captured.
  - The harness hid the dev-only "Color palette (dev)" menu row, which a release build does not have.
  - Not checked how the footer fits with pending invitations or in the other 6 languages. On `main`, the Connectors label already overflows when the invitations button is shown; this PR does not change that.
  - Settings › Updates still has its own **Restart** button with no confirmation. That is out of scope here.
  - The `header.test.tsx` "workspace menu opens computer management" bun test fails the same way on `main`, and it is unrelated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
