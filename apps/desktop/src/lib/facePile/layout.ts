import { settle } from './physics.ts'

import type { Body, Rect, World } from './physics.ts'

export type SceneInput = {
  width: number
  height: number
  /** The sign-in column, in the pile's coordinates. Faces never cover it (M4). */
  form: Rect
  count: number
  reducedMotion: boolean
}

export const DROP_GAP_S = 0.04
const DROP_START_S = 0.2
const WALL_MARGIN = 16
const GOLDEN = 0.618034
const FIRST_ROW = 10
const FIRST_ROW_SKID = 700

/** Square tile side for a window: big enough to read the face, small enough for 28 to fit. */
export function tileSize(width: number, height: number): number {
  return Math.round(Math.min(84, Math.max(52, Math.min(width * 0.068, height * 0.1))))
}

/** M4: the form plus a margin, open to the sky so nothing can land on top of it. */
export function formWall(form: Rect): Rect {
  return {
    left: form.left - WALL_MARGIN,
    top: -1e6,
    right: form.right + WALL_MARGIN,
    bottom: form.bottom + WALL_MARGIN / 2,
  }
}

/** Deterministic 0..1 sequence so every load (and every test) gets the same pile. */
function spread(i: number, salt: number): number {
  return (i * GOLDEN + salt) % 1
}

function spawn(i: number, input: SceneInput, tile: number, wall: Rect): Body {
  const r = tile * 0.56
  const left = Math.min(wall.right + r, input.width - r)
  const span = Math.max(0, input.width - r - left)
  const first = i < FIRST_ROW

  return {
    // The first faces drop by the right edge and skid downhill along the slippery
    // floor, laying the bottom row under the form; the rest pile up on the right.
    x: first ? input.width - r - spread(i, 0.3) * tile : left + spread(i, 0.3) * span,
    y: -r * 2 - spread(i, 0.7) * tile * 2,
    vx: first ? -FIRST_ROW_SKID : (spread(i, 0.1) - 0.5) * 160,
    vy: 200,
    angle: (spread(i, 0.5) - 0.5) * 1.2,
    spin: (spread(i, 0.9) - 0.5) * 14,
    r,
    wakeAt: DROP_START_S + i * DROP_GAP_S,
    held: false,
    grounded: false,
  }
}

/** The world the face pile starts from; already settled when motion is reduced (M5). */
export function buildScene(input: SceneInput): World {
  const tile = tileSize(input.width, input.height)
  const wall = formWall(input.form)
  const rise = Math.min(80, input.width * 0.06)
  const world: World = {
    width: input.width,
    // Rises to the right like the mockup, with room below for the floor band.
    floor: { y0: input.height - tile * 0.25, slope: -rise / input.width },
    walls: [wall],
    bodies: Array.from({ length: input.count }, (_, i) => spawn(i, input, tile, wall)),
    time: 0,
  }

  return input.reducedMotion ? settle(world) : world
}

/** Keeps a dragged face inside the window and out of the form (M3 + M4). */
export function clampHeld(world: World, body: Body, x: number, y: number): void {
  body.x = Math.min(Math.max(x, body.r), world.width - body.r)
  body.y = Math.min(y, world.floor.y0 + world.floor.slope * body.x - body.r)
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
