import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { keepPyramid, keptPyramid, resetKeptPyramid } from './keptPyramid.ts'
import { buildPyramid } from './pyramid.ts'

describe('kept pyramid (F8)', () => {
  it('starts empty, keeps the last world, and resets for a new sign-in', () => {
    resetKeptPyramid()
    assert.equal(keptPyramid(), null)
    const world = buildPyramid({
      width: 1440,
      height: 900,
      form: { left: 120, top: 0, right: 480, bottom: 500 },
    })

    keepPyramid({ world, tile: 84 })
    assert.equal(keptPyramid()?.world, world)
    resetKeptPyramid()
    assert.equal(keptPyramid(), null)
  })
})
