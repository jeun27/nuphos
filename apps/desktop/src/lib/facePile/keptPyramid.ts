import type { World } from './physics.ts'

/**
 * The one face pyramid every onboarding screen shows. Each screen mounts its own
 * view of it, so the world lives here: the next screen picks it up as the last one
 * left it, stacked or blown apart, instead of stacking it again.
 */
export type KeptPyramid = { world: World; tile: number }

let kept: KeptPyramid | null = null

export function keptPyramid(): KeptPyramid | null {
  return kept
}

export function keepPyramid(next: KeptPyramid): void {
  kept = next
}

/** A new sign-in starts with a standing pyramid, not the last session's pile. */
export function resetKeptPyramid(): void {
  kept = null
}
