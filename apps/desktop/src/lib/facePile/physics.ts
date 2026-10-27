// A tiny 2D step for the sign-in face pile: round bodies, one tilted floor, the
// window's side walls and rectangular keep-out walls. Position-based, fixed step,
// no allocations per step. Bodies are circles so the solver stays small; the
// square tile drawn on top only borrows the body's angle.

export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  r: number
  /** Not simulated before this world time (seconds): the staggered drop. */
  wakeAt: number
  held: boolean
  grounded: boolean
}

export type Rect = { left: number; top: number; right: number; bottom: number }

/** The floor is the line y = y0 + slope * x; positive slope drops to the right. */
export type Floor = { y0: number; slope: number }

export type World = {
  width: number
  floor: Floor
  walls: Rect[]
  bodies: Body[]
  time: number
}

export const STEP_S = 1 / 120
const GRAVITY = 2600
const FLOOR_BOUNCE = 0.32
const BODY_BOUNCE = 0.12
/**
 * Contact friction: below `stick` tangential speed a contact holds (static friction),
 * otherwise it keeps `slide` of its speed. Faces hold on each other only up to about a
 * 30° slope so the pile keeps a pile shape; walls are frictionless so faces slide down
 * them instead of stacking into a tower.
 */
type Grip = { stick: number; slide: number }
const FLOOR_GRIP: Grip = { stick: 0, slide: 0.998 }
const BODY_GRIP: Grip = { stick: 12, slide: 1 }
const WALL_GRIP: Grip = { stick: 0, slide: 1 }
const BOUNCE_MIN = 26
const ITERATIONS = 4
const REST_SPEED = 6
const MAX_SPEED = 2400
/** Outward normals of a rectangle's left, right, top and bottom sides. */
const SIDE_NORMALS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function floorY(floor: Floor, x: number): number {
  return floor.y0 + floor.slope * x
}

export function floorAngle(floor: Floor): number {
  return Math.atan(floor.slope)
}

export function isActive(body: Body, time: number): boolean {
  return !body.held && time >= body.wakeAt
}

/** Bounce off a contact with unit normal (nx, ny) pointing out of the obstacle. */
function bounce(b: Body, nx: number, ny: number, restitution: number, grip: Grip): void {
  const vn = b.vx * nx + b.vy * ny

  if (vn >= 0) return
  let tx = b.vx - vn * nx
  let ty = b.vy - vn * ny

  if (Math.hypot(tx, ty) < grip.stick) {
    tx = 0
    ty = 0
  }
  const out = Math.abs(vn) * restitution > BOUNCE_MIN ? -vn * restitution : 0

  b.vx = tx * grip.slide + out * nx
  b.vy = ty * grip.slide + out * ny
}

function solveFloor(b: Body, floor: Floor): void {
  const len = Math.hypot(floor.slope, 1)
  const nx = floor.slope / len
  const ny = -1 / len
  const depth = b.r - (floorY(floor, b.x) - b.y) / len

  if (depth <= 0) return
  b.x += nx * depth
  b.y += ny * depth
  b.grounded = true
  bounce(b, nx, ny, FLOOR_BOUNCE, FLOOR_GRIP)
}

function solveSides(b: Body, width: number): void {
  if (b.x < b.r) {
    b.x = b.r
    b.vx = Math.abs(b.vx) * FLOOR_BOUNCE
  } else if (b.x > width - b.r) {
    b.x = width - b.r
    b.vx = -Math.abs(b.vx) * FLOOR_BOUNCE
  }
}

/** Pushes a circle out of a rectangle; returns true when they touched. */
export function pushOutOfRect(b: Body, rect: Rect): boolean {
  const cx = Math.min(Math.max(b.x, rect.left), rect.right)
  const cy = Math.min(Math.max(b.y, rect.top), rect.bottom)
  let dx = b.x - cx
  let dy = b.y - cy
  let dist = Math.hypot(dx, dy)

  if (dist >= b.r) return false
  if (dist === 0) {
    // Centre inside: leave through the nearest side.
    const exits = [b.x - rect.left, rect.right - b.x, b.y - rect.top, rect.bottom - b.y]
    const side = exits.indexOf(Math.min(...exits))

    ;[dx, dy] = SIDE_NORMALS[side]
    dist = -exits[side]
  } else {
    dx /= dist
    dy /= dist
  }
  b.x += dx * (b.r - dist)
  b.y += dy * (b.r - dist)
  bounce(b, dx, dy, BODY_BOUNCE, WALL_GRIP)

  return true
}

function solvePair(a: Body, b: Body, time: number): void {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const min = a.r + b.r
  const distSq = dx * dx + dy * dy

  if (distSq >= min * min || distSq === 0) return
  const dist = Math.sqrt(distSq)
  const nx = dx / dist
  const ny = dy / dist
  const overlap = min - dist
  const aMoves = isActive(a, time)
  const bMoves = isActive(b, time)

  if (!aMoves && !bMoves) return
  // A held or sleeping-in-the-sky body is immovable, so the other takes the whole push.
  const share = aMoves && bMoves ? 0.5 : 1

  if (aMoves) {
    a.x -= nx * overlap * share
    a.y -= ny * overlap * share
    bounce(a, -nx, -ny, BODY_BOUNCE, BODY_GRIP)
  }
  if (bMoves) {
    b.x += nx * overlap * share
    b.y += ny * overlap * share
    bounce(b, nx, ny, BODY_BOUNCE, BODY_GRIP)
  }
  // The normal points from a to b, so the upper body is the one resting on the other.
  if (ny > 0.3 && aMoves) a.grounded = true
  if (ny < -0.3 && bMoves) b.grounded = true
}

/** Tumble in the air, then ease the tile flat against the floor once it rests on something. */
function turn(b: Body, floor: Floor): void {
  if (!b.grounded) {
    b.angle += b.spin * STEP_S

    return
  }
  const base = floorAngle(floor)
  const quarter = Math.PI / 2
  const target = base + Math.round((b.angle - base) / quarter) * quarter

  b.spin *= 0.8
  b.angle += (target - b.angle) * 0.12
}

function integrate(b: Body): void {
  b.vy += GRAVITY * STEP_S
  const speed = Math.hypot(b.vx, b.vy)

  if (speed > MAX_SPEED) {
    b.vx *= MAX_SPEED / speed
    b.vy *= MAX_SPEED / speed
  }
  b.x += b.vx * STEP_S
  b.y += b.vy * STEP_S
  b.grounded = false
}

export function step(world: World): void {
  const { bodies, floor, walls, width } = world

  world.time += STEP_S
  for (const b of bodies) if (isActive(b, world.time)) integrate(b)
  for (let k = 0; k < ITERATIONS; k++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) solvePair(bodies[i], bodies[j], world.time)
    }
    for (const b of bodies) {
      if (!isActive(b, world.time)) continue
      for (const wall of walls) pushOutOfRect(b, wall)
      solveSides(b, width)
      solveFloor(b, floor)
    }
  }
  for (const b of bodies) if (isActive(b, world.time)) turn(b, floor)
}

/** Every body has dropped and nothing is moving: the loop can stop. */
export function isSettled(world: World): boolean {
  return world.bodies.every(
    (b) =>
      !b.held &&
      world.time >= b.wakeAt &&
      Math.hypot(b.vx, b.vy) < REST_SPEED &&
      Math.abs(b.spin) < 0.05,
  )
}

/** Runs the world forward until it settles, for reduced motion and tests. */
export function settle(world: World, maxSteps = 120 * 30): World {
  for (let i = 0; i < maxSteps && !isSettled(world); i++) step(world)

  return world
}
