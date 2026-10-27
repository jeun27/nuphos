import type { Body, Rect, World } from './physics.ts'

const WALL_MARGIN = 16

/** Square tile side for a window: big enough to read the face, small enough for the pyramid to fit. */
export function tileSize(width: number, height: number): number {
  return Math.round(Math.min(84, Math.max(52, Math.min(width * 0.068, height * 0.1))))
}

/** The form plus a margin, open to the sky so nothing can land on top of it. */
export function formWall(form: Rect): Rect {
  return {
    left: form.left - WALL_MARGIN,
    top: -1e6,
    right: form.right + WALL_MARGIN,
    bottom: form.bottom + WALL_MARGIN / 2,
  }
}

/** The smallest box around the keep-out elements, in `to`'s coordinates. */
export function keepOutRect(els: Element[], to: Element): Rect {
  const boxes = els.map((el) => el.getBoundingClientRect())
  const b = to.getBoundingClientRect()

  return {
    left: Math.min(...boxes.map((r) => r.left)) - b.left,
    top: Math.min(...boxes.map((r) => r.top)) - b.top,
    right: Math.max(...boxes.map((r) => r.right)) - b.left,
    bottom: Math.max(...boxes.map((r) => r.bottom)) - b.top,
  }
}

/** Keeps a dragged face inside the window and out of the form. */
export function clampHeld(world: World, body: Body, x: number, y: number): void {
  body.x = Math.min(Math.max(x, body.r), world.width - body.r)
  body.y = Math.min(y, world.floor.y0 - body.r)
  for (const wall of world.walls) {
    if (
      body.x > wall.left - body.r &&
      body.x < wall.right + body.r &&
      body.y < wall.bottom + body.r
    ) {
      const toLeft = body.x - (wall.left - body.r)
      const toRight = wall.right + body.r - body.x
      const toBottom = wall.bottom + body.r - body.y

      if (toBottom < Math.min(toLeft, toRight)) body.y = wall.bottom + body.r
      else body.x = toLeft < toRight ? wall.left - body.r : wall.right + body.r
    }
  }
}
