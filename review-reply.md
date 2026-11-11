Addressed in 394395b6.

1. **Copy.** The body now reads "Restart to finish installing Nuphos {version}. Agents on this computer stop, so replies still running there are cut off." It's updated in all 7 locales, the old string is removed, and `src/i18n/i18n.test.ts` passes. What I checked, by reading the code at this head:
   - `installUpdate()` (`electron/main/updater.ts`) goes straight to `autoUpdater.quitAndInstall()`. It does not wait for running turns.
   - The `before-quit` handler (`electron/main.ts`) awaits `stopLocalRuntime()`. That calls `controller.shutdown()`, which runs `stopAgentProcess` for every local agent and shuts down the instances. So a reply in progress on this computer is cut off.
   - On the next launch, the auth subscription calls `controller.setUser()`, which launches the local agents again when signed in. I did **not** verify end to end that an interrupted turn resumes or that an unsent draft survives, so the dialog claims neither. It also drops "reconnect".
2. **Visual evidence.** Light-theme captures from this head are in the comment above (idle, hover pill, percent while downloading, Help menu row, dialog, and a hover → dialog recording), pinned to commit-fixed raw URLs.

I understand that merging needs a maintainer's visual OK. I haven't enqueued it.
