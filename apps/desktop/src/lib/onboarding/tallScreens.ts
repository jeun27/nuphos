/** The cloud runtime step's headline. */
export const CLOUD_HEADLINE = 'Keep working when your computer is closed'

/** The self-hosted deploy step's headline for a platform. */
export function deployHeadline(platform: string): string {
  return `Deploy on ${platform}`
}

/**
 * The tallest onboarding screens, which set the headline size for every screen in a
 * window: the largest at which all of them still fit. Each headline is measured live
 * in the window's real font; the rest is its height below the headline with spacing
 * at the floor (measured in the fixture, a 360 px column). The cloud step is the
 * tallest on wide windows (a 3-line headline), the deploy steps on short ones.
 */
export const TALL_SCREENS = [
  { headline: CLOUD_HEADLINE, belowHeadline: 351 },
  { headline: deployHeadline('Railway'), belowHeadline: 389 },
  { headline: deployHeadline('Docker Compose'), belowHeadline: 390 },
]
