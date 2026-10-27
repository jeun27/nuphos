import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { clampHeld, formWall, tileSize } from './layout.ts'
import { isSettled, pushOutOfRect, settle, step } from './physics.ts'
import { buildPyramid, explode } from './pyramid.ts'

import type { Body, World } from './physics.ts'

const FORM = { left: 100, top: 70, right: 455, bottom: 500 }
const SIZES: [number, number][] = [
  [1072, 690],
  [900, 640],
  [1400, 900],
]

/** A settled pile: the pyramid, blown apart and left to come to rest. */
function pile(width: number, height: number): World {
  const world = buildPyramid({ width, height, form: FORM })

  explode(world, world.bodies[0].x, world.bodies[0].y)

  return settle(world)
}

/** Within 1 px of a keep-out wall; the wall itself already sits 16 px outside the form. */
function touchesWall(b: Body, world: World): boolean {
  return world.walls.some((w) => {
    const cx = Math.min(Math.max(b.x, w.left), w.right)
    const cy = Math.min(Math.max(b.y, w.top), w.bottom)

    return Math.hypot(b.x - cx, b.y - cy) < b.r - 1
  })
}

describe('face layout', () => {
  it('sizes tiles between 52 and 84 px', () => {
    assert.equal(tileSize(400, 300), 52)
    assert.equal(tileSize(3000, 2000), 84)
  })

  it('opens the form wall to the sky so nothing lands on the form', () => {
    const wall = formWall(FORM)

    assert.ok(wall.top < -1000)
    assert.ok(wall.left < FORM.left && wall.right > FORM.right && wall.bottom > FORM.bottom)
  })
})

describe('face physics', () => {
  for (const [width, height] of SIZES) {
    it(`settles every face on the floor, upright and off the form, at ${String(width)}x${String(height)}`, () => {
      const world = pile(width, height)

      assert.ok(isSettled(world))
      for (const b of world.bodies) {
        assert.ok(!touchesWall(b, world), 'face covers the form')
        assert.ok(b.x >= b.r - 0.5 && b.x <= width - b.r + 0.5, 'face left the window')
        assert.ok(b.y <= world.floor.y0 - b.r + 1, 'face sank into the floor')
        assert.ok(
          Math.abs(Math.sin(b.angle)) < 0.05 && Math.cos(b.angle) > 0,
          'face is not upright',
        )
      }
    })
  }

  it('lets a thrown face push the others without entering the form', () => {
    const world = pile(1072, 690)
    const last = world.bodies.length - 1
    const thrown = world.bodies[last]

    Object.assign(thrown, { x: 900, y: 120, vx: -2400, vy: 600, grounded: false })
    const before = world.bodies.map((b) => [b.x, b.y])

    for (let i = 0; i < 240; i++) step(world)
    assert.ok(!touchesWall(thrown, world))
    assert.ok(
      world.bodies.some(
        (b, i) => i !== last && Math.hypot(b.x - before[i][0], b.y - before[i][1]) > 2,
      ),
    )
  })

  it('pushes a body out of a rectangle through the nearest side', () => {
    const b: Body = {
      x: 110,
      y: 300,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      r: 20,
      wakeAt: 0,
      held: false,
      grounded: false,
    }

    assert.ok(pushOutOfRect(b, FORM))
    assert.equal(b.x, FORM.left - 20)
  })
})

describe('face interaction', () => {
  it('keeps a dragged face out of the form and inside the window', () => {
    const world = pile(1072, 690)
    const b = world.bodies[0]

    clampHeld(world, b, 300, 300)
    assert.ok(!touchesWall(b, world))
    clampHeld(world, b, -50, 2000)
    assert.ok(b.x >= b.r && b.y <= world.floor.y0 - b.r + 1e-6)
  })
})

describe('coincident faces (F1)', () => {
  it('parts two faces on the very same spot', () => {
    const world = pile(1072, 690)
    const [a, b] = world.bodies

    Object.assign(b, { x: a.x, y: a.y, vx: 0, vy: 0, grounded: false })
    for (let i = 0; i < 60; i++) step(world)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r)
  })
})
