import assert from 'node:assert/strict'
import { it } from 'node:test'

import { bubbleOffset } from './bubble.ts'

const base = { tile: 70, w: 200, h: 26, width: 900 }

it('centres the bubble when it fits', () => {
  assert.deepEqual(bubbleOffset({ ...base, x: 450, y: 400 }), { dx: 0, below: false })
})

it('shifts the bubble inside the right and left window edges', () => {
  const right = bubbleOffset({ ...base, x: 880, y: 400 })
  const left = bubbleOffset({ ...base, x: 20, y: 400 })

  assert.equal(880 + right.dx + base.w / 2, 900 - 8)
  assert.equal(20 + left.dx - base.w / 2, 8)
})

it('flips the bubble below a face held near the top', () => {
  assert.equal(bubbleOffset({ ...base, x: 450, y: 50 }).below, true)
})

it('keeps a bubble wider than the window on its left edge', () => {
  const { dx } = bubbleOffset({ ...base, w: 1000, x: 450, y: 400 })

  assert.equal(450 + dx - 500, 8)
})
