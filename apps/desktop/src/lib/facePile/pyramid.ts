// The email-code step's face pyramid: 21 faces stacked 6-5-4-3-2-1 on a flat
// floor right of the form. It sleeps until one click blows it apart (P1, P3),
// then the faces are a normal pile the shared physics drives (P4).

import { formWall, tileSize } from './layout.ts'

import type { Body, Rect, World } from './physics.ts'

export const PYRAMID_ROWS = 6
export const PYRAMID_COUNT = (PYRAMID_ROWS * (PYRAMID_ROWS + 1)) / 2

/** A body that never wakes until the blast: the physics step skips it entirely. */
const ASLEEP = Number.POSITIVE_INFINITY
const BLAST_SPEED = 1800
const MIN_SPEED = 1100
/** A little lift so the low faces leave the floor instead of skidding along it. */
const LIFT = 0.35
const MAX_SPIN = 22

export type PyramidInput = {
  width: number
  height: number
  form: Rect
  /** Left edge of the screen's scene region. The pyramid centres in it, so it stands in
   *  the same place on every screen however wide that screen's headline runs. */
  sceneLeft?: number
}

/** Where the pyramid's space starts: right of the form wall and inside the scene region. */
function spaceLeft(input: PyramidInput): number {
  // From the scene edge when there is one, so a headline that wraps right at that edge
  // never nudges the pyramid; the form wall still keeps faces off it once they move.
  return input.sceneLeft === undefined
    ? formWall(input.form).right
    : Math.max(input.sceneLeft, input.form.right)
}

/** Room loose faces keep clear of the window's right edge; the standing pyramid may use it. */
const EDGE = 16

type Slot = { x: number; y: number; row: number }

/** Gap between stacked tiles: whole pixels, so every tile edge lands on a pixel. */
function gapFor(tile: number): number {
  return Math.max(4, 2 * Math.round(tile * 0.06))
}

/** The shared tile size, shrunk when the bottom row would not fit right of the form wall. */
export function pyramidTile(input: PyramidInput): number {
  const space = input.width - spaceLeft(input)
  const fit = Math.floor(space / (PYRAMID_ROWS * 1.14))

  // Even, so half a tile is a whole pixel too.
  return 2 * Math.floor(Math.min(tileSize(input.width, input.height), fit) / 2)
}

/** A level floor on a whole pixel, as in the mockup. */
function floorLine(input: PyramidInput): number {
  return Math.round(input.height - tileSize(input.width, input.height) * 0.7)
}

/**
 * Slot centres, bottom row first, centred in the free space right of the form wall.
 * Tile, gap and pitch are even numbers of pixels, so every tile's top-left corner
 * is an integer: borders and shadows stay crisp and the rows stay level.
 */
export function pyramidSlots(input: PyramidInput): Slot[] {
  const tile = pyramidTile(input)
  const pitch = tile + gapFor(tile)
  const half = pitch / 2
  const wallRight = spaceLeft(input)
  const left = Math.round(
    wallRight + Math.max(0, (input.width - wallRight - PYRAMID_ROWS * pitch) / 2),
  )
  const floor = floorLine(input)
  const slots: Slot[] = []

  for (let row = 0; row < PYRAMID_ROWS; row++) {
    for (let col = 0; col < PYRAMID_ROWS - row; col++) {
      slots.push({ x: left + half + row * half + col * pitch, y: floor - half - row * pitch, row })
    }
  }

  return slots
}

function asleepAt(slot: Slot, r: number): Body {
  return {
    x: slot.x,
    y: slot.y,
    vx: 0,
    vy: 0,
    angle: 0,
    spin: 0,
    r,
    wakeAt: ASLEEP,
    held: false,
    grounded: true,
  }
}

/** P1: the faces arrive already stacked and nothing falls on its own. */
export function buildPyramid(input: PyramidInput): World {
  const tile = pyramidTile(input)
  // Half the pitch, so neighbouring bodies just touch and nothing overlaps at rest.
  const r = (tile + gapFor(tile)) / 2

  return {
    width: input.width - EDGE,
    floor: { y0: floorLine(input) },
    walls: [formWall(input.form)],
    bodies: pyramidSlots(input).map((slot) => asleepAt(slot, r)),
    time: 0,
  }
}

export function isStanding(world: World): boolean {
  return world.bodies.every((b) => b.wakeAt === ASLEEP)
}

/**
 * P3: wakes every face with a radial burst from the click. Speed falls off with
 * distance, so the faces next to the click fly hardest (some off the top; the side
 * bounds and gravity bring them back), and every face spins away from the blast.
 */
export function explode(world: World, x: number, y: number): void {
  const reach = (world.bodies[0]?.r ?? 1) * 2

  for (const b of world.bodies) {
    const dx = b.x - x
    const dy = b.y - y
    const dist = Math.hypot(dx, dy)
    // The clicked face itself has no "away", so it shoots straight up.
    const nx = dist < 1 ? 0 : dx / dist
    const ny = (dist < 1 ? -1 : dy / dist) - LIFT
    const len = Math.hypot(nx, ny)
    const falloff = 1 / (1 + dist / reach)
    const speed = MIN_SPEED + BLAST_SPEED * falloff

    b.vx = (nx / len) * speed
    b.vy = (ny / len) * speed
    b.spin = (dx < 0 ? -1 : 1) * (4 + MAX_SPIN * falloff)
    b.wakeAt = world.time
    b.grounded = false
  }
}

/** P4: puts every face back in its slot, asleep and level, as on arrival. */
export function restack(world: World, input: PyramidInput): void {
  const slots = pyramidSlots(input)

  world.bodies.forEach((b, i) => Object.assign(b, asleepAt(slots[i], b.r)))
}

/**
 * Fits a pyramid world to a new window or form, so one pyramid can follow the user
 * from screen to screen. A standing pyramid is re-stacked in its new slots; faces
 * already blown apart keep their places (pulled inside the window) and wake, so the
 * physics settles them clear of the new form.
 */
export function refitPyramid(world: World, input: PyramidInput): void {
  // A screen being torn down measures 0x0; fitting to that would pile every face on one spot.
  if (input.width <= 0 || input.height <= 0) return
  const fresh = buildPyramid(input)
  const standing = isStanding(world)
  // Scattered faces keep their place relative to the window, so a narrower window
  // spreads them over the new floor instead of pushing them into one column.
  const scale = fresh.width / Math.max(1, world.width)
  const oldFloor = world.floor.y0

  world.width = fresh.width
  world.floor = fresh.floor
  world.walls = fresh.walls
  world.bodies.forEach((b, i) => {
    if (standing) {
      Object.assign(b, fresh.bodies[i])

      return
    }
    b.r = fresh.bodies[i].r
    b.held = false
    b.x = Math.min(Math.max(b.x * scale, b.r), world.width - b.r)
    b.y = Math.min(world.floor.y0 - (oldFloor - b.y), world.floor.y0 - b.r)
    b.wakeAt = world.time
    b.grounded = false
  })
}

export type PressAction = 'explode' | 'drag' | 'none'

/**
 * P5 + P6: a press on a face never moves focus off the code field, so the
 * default (focus change, text selection) is always cancelled. Reduced motion
 * leaves the pyramid still and the press does nothing.
 */
export function pressAction(
  event: { preventDefault: () => void; button: number },
  state: { reducedMotion: boolean; standing: boolean },
): PressAction {
  event.preventDefault()
  if (state.reducedMotion || event.button !== 0) return 'none'

  return state.standing ? 'explode' : 'drag'
}
