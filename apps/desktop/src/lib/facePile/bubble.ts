const EDGE = 8
const GAP = 10

export type BubbleInput = {
  /** Centre of the held face, in the pile's coordinates. */
  x: number
  y: number
  tile: number
  /** The bubble's rendered size. */
  w: number
  h: number
  /** Width of the pile (the window). */
  width: number
}

/**
 * Where a held face's bubble goes so it never leaves the window: shifted sideways by
 * `dx` from centred, and below the face instead of above when there is no room on top.
 */
export function bubbleOffset({ x, y, tile, w, h, width }: BubbleInput): {
  dx: number
  below: boolean
} {
  const overLeft = EDGE - (x - w / 2)
  const overRight = x + w / 2 - (width - EDGE)
  // Too wide for the window: line it up with the left edge.
  const dx = overLeft > 0 ? overLeft : Math.min(0, -overRight)

  return { dx: Math.round(dx), below: y - tile / 2 - GAP - h < EDGE }
}
