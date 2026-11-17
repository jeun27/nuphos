Rebuilt this on current `main` as one commit and updated the description with new before/after captures.

- **Dialog:** switched to the standard `ConfirmDialog`, and `update-dialog.tsx` is gone. It didn't lack anything we need: title, description, Update / Not now and `onConfirm` cover it. I dropped the custom 400 px rounded look rather than adding a variant.
- **Button:** yes, it fits. The pill is now `Button` (primary, sm, `!rounded-full`), and the hover label is just a child that animates its own width, so it needed no new variant. The raw `<button>` would also have tripped `primitiveGuard.test.ts`.
- **Main:** brought in by re-applying the change on top of `0fcd14d3`. The old files had moved too much to merge cleanly.

What changed in the look, and why:
- The footer is now avatar / Connectors / Help, and Connectors fills the gap, so there's no free slot for a second button. The update button still sits left of Help, at the same size as the avatar and Connectors (32 px). The hover pill now grows left over Connectors instead of pushing the row, and the Connectors label fades out while the pill is open (hover or keyboard focus, CSS only), so nothing shows half-covered. Connectors hides its three logo chips when it's too narrow for them, so its label still fits.
- #2505 removed the download at click time, so the percent no longer shows after a click. It now covers the remaining visible download: a newer release replacing the update already on offer. The button stays, disabled, with the percent, instead of vanishing.
- In the copy, "Agents" is now "Bots and tasks", on purpose, following the product-word rule from #3250 (its first batch, #3256, already renamed the labels). The meaning is unchanged: things on this computer stop, running replies are cut off, and it makes no promise that anything resumes. Translations are updated to match.

Not done: Settings › Updates still restarts without asking. I can do that in a follow-up if you want the same dialog there.
