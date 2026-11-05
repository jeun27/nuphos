Visuals for HEADSHA

**No device or emulator capture exists for this PR.** There's no Android emulator available to me (no KVM in my sandbox, and no Android SDK on the Mac I use), and the repo has no Compose screenshot path (no Paparazzi or Roborazzi) I could render through instead. Nothing here has run on a device.

What the unit tests cover (CI: `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug`):
- `RuntimeBlockedConflictTest`: `runtime_login_required`, `runtime_disabled`, `runtime_not_found` and `runtime_offline` each become `Conflict.RuntimeBlocked`, never mention "Settings", and are in `switchRuntimeErrors`. That set decides whether the hint row shows **Switch runtime**. Other codes keep the server's text.
- `ShareApprovalTest`: the declined message says "Switch to another runtime".

Not covered by tests, so please check these on a device, Lin's team:
1. **Switch runtime** under a runtime error row, and on the owner-declined strip. Both should open the conversation's runtime sheet. They should show only for someone who can manage the conversation.
2. **Runtimes › Sign in** instructions, for your own computer and for a teammate's computer you only `use`.

The iOS counterpart #1590 shows the same states and copy on a simulator.
