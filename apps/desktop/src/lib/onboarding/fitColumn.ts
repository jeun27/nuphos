/**
 * How far an onboarding column shrinks to fit its window: each level is 1 at full
 * size and 0 at the readable floor (tokens.css maps them to sizes).
 *
 * - top: the space above the headline and the headline itself. One level per
 *   window, so the headline has the same size and place on every screen.
 * - space: the spacing and controls below the headline, fitted per screen.
 */
export type Fit = { top: number; space: number }

// Halvings per level: 1/64 steps, finer than the whole-pixel sizes they map to.
const DEPTH = 6

/** The largest level in [0, 1] that fits, given fits() turns false as the level grows. */
function largest(fits: (level: number) => boolean): number {
  if (fits(1)) return 1
  let lo = 0
  let hi = 1

  for (let i = 0; i < DEPTH; i++) {
    const mid = (lo + hi) / 2

    if (fits(mid)) lo = mid
    else hi = mid
  }

  return lo
}

/**
 * The top level is the largest at which the tallest onboarding screen still fits
 * with its spacing at the floor, so it depends on the window alone. This screen's
 * spacing then grows into whatever room it has left. A screen that can't fit even
 * at the floor keeps the shared top level and scrolls.
 */
export function fitColumn(
  tallestFits: (top: number) => boolean,
  screenFits: (fit: Fit) => boolean,
): Fit {
  const top = largest(tallestFits)

  return { top, space: largest((space) => screenFits({ top, space })) }
}
