import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formWall } from './layout.ts'
import { isSettled, settle, step } from './physics.ts'
import {
  buildPyramid,
  explode,
  isStanding,
  PYRAMID_COUNT,
  pressAction,
  pyramidSlots,
  pyramidTile,
  refitPyramid,
  restack,
} from './pyramid.ts'

import type { World } from './physics.ts'
import type { PyramidInput } from './pyramid.ts'

const FORM = { left: 100, top: 70, right: 500, bottom: 470 }
const SIZES: [number, number][] = [
  [1160, 720],
  [900, 640],
  [1400, 900],
]

function input(width = 1160, height = 720): PyramidInput {
  return { width, height, form: FORM }
}

function press(button = 0) {
  let prevented = false

  return {
    event: {
      button,
      preventDefault: () => {
        prevented = true
      },
    },
    prevented: () => prevented,
  }
}

function positions(world: World): number[][] {
  return world.bodies.map((b) => [b.x, b.y])
}

describe('face pyramid layout (P1)', () => {
  it('stacks 21 faces as rows of 6, 5, 4, 3, 2, 1', () => {
    const slots = pyramidSlots(input())
    const rows = [0, 1, 2, 3, 4, 5].map((row) => slots.filter((s) => s.row === row).length)

    assert.equal(PYRAMID_COUNT, 21)
    assert.equal(slots.length, 21)
    assert.deepEqual(rows, [6, 5, 4, 3, 2, 1])
  })

  for (const [width, height] of SIZES) {
    it(`fits right of the form wall without overlaps at ${String(width)}x${String(height)}`, () => {
      const world = buildPyramid(input(width, height))
      const wall = formWall(FORM)

      for (const [i, a] of world.bodies.entries()) {
        assert.ok(a.x - a.r >= wall.right - 0.01, `face ${String(i)} clears the wall`)
        assert.ok(a.x + a.r <= width + 0.01, `face ${String(i)} is inside the window`)
        assert.ok(
          a.y + a.r <= world.floor.y0 + 0.01,
          `face ${String(i)} sits on or above the floor`,
        )
        for (const b of world.bodies.slice(i + 1)) {
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 0.01)
        }
      }
    })

    it(`puts every tile corner on a whole pixel, level and evenly spaced at ${String(width)}x${String(height)}`, () => {
      const tile = pyramidTile(input(width, height))
      const slots = pyramidSlots(input(width, height))

      for (const s of slots) {
        assert.ok(Number.isInteger(s.x - tile / 2) && Number.isInteger(s.y - tile / 2))
      }
      for (let row = 0; row < 6; row++) {
        const xs = slots.filter((s) => s.row === row).map((s) => s.x)
        const ys = new Set(slots.filter((s) => s.row === row).map((s) => s.y))
        const gaps = new Set(xs.slice(1).map((x, i) => x - xs[i]))

        assert.equal(ys.size, 1, 'one height per row')
        assert.ok(gaps.size <= 1, 'one spacing per row')
      }
      assert.ok(buildPyramid(input(width, height)).bodies.every((b) => b.angle === 0))
    })
  }

  it('centres the top face over the bottom row', () => {
    const slots = pyramidSlots(input())
    const bottom = slots.filter((s) => s.row === 0)
    const top = slots.find((s) => s.row === 5)

    assert.ok(top)
    assert.ok(Math.abs(top.x - (bottom[0].x + bottom[5].x) / 2) < 0.01)
  })

  it('stays put on its own: nothing falls without a click', () => {
    const world = buildPyramid(input())
    const before = positions(world)

    for (let i = 0; i < 240; i++) step(world)
    assert.deepEqual(positions(world), before)
    assert.ok(isStanding(world))
  })
})

describe('exploding the pyramid (P3)', () => {
  it('pushes every face straight away from the click', () => {
    const world = buildPyramid(input())
    const hit = world.bodies[8]
    const at = { x: hit.x + 5, y: hit.y + 3 }

    explode(world, at.x, at.y)
    for (const b of world.bodies) {
      const away = (b.x - at.x) * b.vx + (b.y - at.y) * b.vy

      assert.ok(away > 0, 'velocity points away from the blast')
    }
    assert.ok(!isStanding(world))
  })

  it('sends faces near the click flying hardest, falling off with distance', () => {
    const world = buildPyramid(input())
    const hit = world.bodies[3]

    explode(world, hit.x, hit.y)
    const bySpeed = world.bodies
      .map((b) => ({ dist: Math.hypot(b.x - hit.x, b.y - hit.y), speed: Math.hypot(b.vx, b.vy) }))
      .sort((a, b) => a.dist - b.dist)

    for (let i = 1; i < bySpeed.length; i++) {
      assert.ok(bySpeed[i].speed <= bySpeed[i - 1].speed + 1e-9, 'farther never flies faster')
    }
    assert.ok(bySpeed[0].speed > bySpeed[bySpeed.length - 1].speed * 1.8)
  })

  it('shoots the clicked face straight up and spins the nearest faces most', () => {
    const world = buildPyramid(input())
    const hit = world.bodies[2]

    explode(world, hit.x, hit.y)
    assert.ok(Math.abs(hit.vx) < 1e-9 && hit.vy < 0)
    const far = world.bodies.reduce((a, b) =>
      Math.hypot(b.x - hit.x, b.y - hit.y) > Math.hypot(a.x - hit.x, a.y - hit.y) ? b : a,
    )

    assert.ok(Math.abs(hit.spin) > Math.abs(far.spin))
    assert.ok(world.bodies.every((b) => b.spin !== 0))
  })

  it('sends some faces off the top of the window', () => {
    const world = buildPyramid(input())
    const hit = world.bodies[0]
    let highest = Infinity

    explode(world, hit.x, hit.y)
    for (let i = 0; i < 120; i++) {
      step(world)
      highest = Math.min(highest, ...world.bodies.map((b) => b.y + b.r))
    }
    assert.ok(highest < 0)
  })

  for (const [width, height] of SIZES) {
    it(`brings every face back and keeps them off the form at ${String(width)}x${String(height)} (P5 wall)`, () => {
      const world = buildPyramid(input(width, height))
      const wall = formWall(FORM)

      explode(world, world.bodies[0].x, world.bodies[0].y)
      settle(world)
      for (const b of world.bodies) {
        const cx = Math.min(Math.max(b.x, wall.left), wall.right)
        const cy = Math.min(Math.max(b.y, wall.top), wall.bottom)

        assert.ok(Math.hypot(b.x - cx, b.y - cy) >= b.r - 1, 'face stays outside the form wall')
        assert.ok(b.x >= b.r - 0.01 && b.x <= width - b.r + 0.01, 'face is back inside the sides')
        assert.ok(b.y > 0 && b.y < height, 'face is back inside the window')
      }
    })
  }
})

describe('restack (P4)', () => {
  it('puts every face back in its slot, asleep and level', () => {
    const world = buildPyramid(input())
    const slots = pyramidSlots(input())

    explode(world, world.bodies[5].x, world.bodies[5].y)
    settle(world)
    restack(world, input())
    assert.ok(isStanding(world))
    world.bodies.forEach((b, i) => {
      assert.deepEqual(
        [b.x, b.y, b.vx, b.vy, b.angle, b.spin],
        [slots[i].x, slots[i].y, 0, 0, 0, 0],
      )
    })
    const before = positions(world)

    for (let i = 0; i < 120; i++) step(world)
    assert.deepEqual(positions(world), before)
  })
})

describe('pressing a face (P5, P6)', () => {
  it('never lets the press move focus off the code field', () => {
    for (const reducedMotion of [false, true]) {
      for (const standing of [false, true]) {
        for (const button of [0, 2]) {
          const p = press(button)

          pressAction(p.event, { reducedMotion, standing })
          assert.ok(
            p.prevented(),
            `prevented for ${JSON.stringify({ reducedMotion, standing, button })}`,
          )
        }
      }
    }
  })

  it('explodes a standing pyramid and drags a fallen face', () => {
    assert.equal(pressAction(press().event, { reducedMotion: false, standing: true }), 'explode')
    assert.equal(pressAction(press().event, { reducedMotion: false, standing: false }), 'drag')
  })

  it('ignores non-primary buttons', () => {
    assert.equal(pressAction(press(2).event, { reducedMotion: false, standing: true }), 'none')
  })

  it('does nothing under reduced motion, and the pyramid stays still', () => {
    const world = buildPyramid(input())
    const before = positions(world)

    assert.equal(pressAction(press().event, { reducedMotion: true, standing: true }), 'none')
    assert.equal(pressAction(press().event, { reducedMotion: true, standing: false }), 'none')
    for (let i = 0; i < 120; i++) step(world)
    assert.deepEqual(positions(world), before)
  })
})

describe('same place on every screen (sceneLeft)', () => {
  it('stands in the scene region whatever the headline width', () => {
    const narrowHeadline = pyramidSlots({ ...input(1440, 900), sceneLeft: 720 })
    const wideHeadline = pyramidSlots({
      ...input(1440, 900),
      form: { ...FORM, right: 690 },
      sceneLeft: 720,
    })

    assert.deepEqual(narrowHeadline, wideHeadline)
    assert.ok(narrowHeadline.every((s) => s.x > 720))
  })
})

describe('one pyramid across screens (refit)', () => {
  // The 900x640 sign-in layout: the form column ends well above the floor.
  const narrow: PyramidInput = {
    width: 900,
    height: 640,
    form: { left: 81, top: 0, right: 441, bottom: 482 },
  }

  it('re-stacks a standing pyramid in the new layout', () => {
    const world = buildPyramid(input())

    refitPyramid(world, narrow)
    assert.ok(isStanding(world))
    assert.deepEqual(positions(world), positions(buildPyramid(narrow)))
  })

  it('keeps a blown-apart pile scattered, inside the window and off the new form', () => {
    const world = buildPyramid(input(1400, 900))

    explode(world, world.bodies[0].x, world.bodies[0].y)
    settle(world)
    refitPyramid(world, narrow)
    assert.ok(!isStanding(world))
    for (const b of world.bodies)
      assert.ok(b.x >= b.r && b.x <= narrow.width - b.r && b.y <= world.floor.y0 - b.r)
    settle(world)
    const wall = formWall(narrow.form)

    for (const b of world.bodies) {
      const cx = Math.min(Math.max(b.x, wall.left), wall.right)
      const cy = Math.min(Math.max(b.y, wall.top), wall.bottom)

      assert.ok(Math.hypot(b.x - cx, b.y - cy) >= b.r - 1, 'face settles clear of the new form')
    }
  })
})

describe('review fixes', () => {
  it('counts a standing pyramid as settled, so the loop never runs for it (F3)', () => {
    const world = buildPyramid(input())

    assert.ok(isSettled(world))
    explode(world, world.bodies[0].x, world.bodies[0].y)
    assert.ok(!isSettled(world))
    restack(world, input())
    assert.ok(isSettled(world))
  })

  it('ignores a 0x0 layout from a screen being torn down (F1)', () => {
    const world = buildPyramid(input())

    explode(world, world.bodies[0].x, world.bodies[0].y)
    settle(world)
    const before = positions(world)

    refitPyramid(world, { width: 0, height: 0, form: { left: 0, top: 0, right: 0, bottom: 0 } })
    assert.deepEqual(positions(world), before)
  })

  it('lets go of a held face when the pyramid moves to another screen (F4)', () => {
    const world = buildPyramid(input())

    explode(world, world.bodies[0].x, world.bodies[0].y)
    world.bodies[3].held = true
    refitPyramid(world, input(900, 640))
    assert.ok(world.bodies.every((b) => !b.held))
  })

  it('spreads a blown-apart pile over a narrower window instead of stacking a tower (F6)', () => {
    const world = buildPyramid(input(1440, 900))

    explode(world, world.bodies[0].x, world.bodies[0].y)
    settle(world)
    refitPyramid(world, input(900, 900))
    settle(world)
    const r = world.bodies[0].r

    assert.ok(
      world.bodies.filter((b) => b.x > 900 - 3 * r).length <= 8,
      'no column at the right edge',
    )
    assert.ok(
      world.bodies.every((b) => b.y - b.r > 0),
      'no face above the window',
    )
  })

  it('stands in the same place when a wrapped headline ends right at the scene edge (F5)', () => {
    const base = { ...input(900, 600), sceneLeft: 540 }
    const wrapped = { ...base, form: { ...FORM, right: 536 } }

    assert.deepEqual(pyramidSlots(base), pyramidSlots(wrapped))
  })

  it('keeps the edge margin for loose faces only, not the standing pyramid (H6)', () => {
    const layout = { ...input(900, 600), sceneLeft: 540 }
    const world = buildPyramid(layout)

    // The bottom row may use the whole space right of the scene edge: 6 rows of 1.14 tiles.
    assert.equal(pyramidTile(layout), 2 * Math.floor(Math.floor(360 / (6 * 1.14)) / 2))
    explode(world, world.bodies[0].x, world.bodies[0].y)
    settle(world)
    assert.ok(
      world.bodies.every((b) => b.x + b.r <= 900 - 16),
      'loose faces stay off the edge',
    )
  })
})
