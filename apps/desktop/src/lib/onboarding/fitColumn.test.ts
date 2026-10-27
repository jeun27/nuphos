import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { fitColumn } from './fitColumn.ts'

import type { Fit } from './fitColumn.ts'

// Columns whose height grows with each level, like the real tokens: the part above
// and including the headline (+200 px at full size) and the spacing below it.
const tallest = (room: number) => (top: number) => 600 + 200 * top <= room
const screen =
  (room: number, base: number, lines = (top: number) => 0 * top) =>
  (fit: Fit) =>
    base + 200 * fit.top + 100 * fit.space + lines(fit.top) <= room

describe('fitColumn', () => {
  it('keeps full size when the window fits the tallest screen', () => {
    assert.deepEqual(fitColumn(tallest(900), screen(900, 400)), { top: 1, space: 1 })
  })

  it('gives every screen in a window the same top level', () => {
    const short = fitColumn(tallest(700), screen(700, 200))
    const tall = fitColumn(tallest(700), screen(700, 400))

    assert.equal(short.top, tall.top)
    assert.ok(short.top > 0.45 && short.top <= 0.5)
  })

  it('fits each screen with its own spacing below the shared headline', () => {
    const short = fitColumn(tallest(700), screen(700, 200))
    const tall = fitColumn(tallest(700), screen(700, 550))

    assert.equal(short.space, 1)
    assert.ok(tall.space > 0.45 && tall.space <= 0.5)
  })

  it('never shrinks one screen below the others: a screen too tall scrolls', () => {
    const fit = fitColumn(tallest(700), screen(700, 900))

    assert.deepEqual(fit, { top: fitColumn(tallest(700), screen(700, 0)).top, space: 0 })
  })

  it('falls back to the floor when even the tallest screen cannot fit', () => {
    assert.equal(fitColumn(tallest(500), screen(500, 100)).top, 0)
  })

  it('never grows the headline as the window gets shorter', () => {
    let last = fitColumn(tallest(900), screen(900, 300))

    for (let room = 890; room >= 500; room -= 10) {
      const fit = fitColumn(
        tallest(room),
        screen(room, 300, (top) => (top > 0.6 ? 120 : 0)),
      )

      assert.ok(fit.top <= last.top, `top grew at ${String(room)}`)
      last = fit
    }
  })
})
