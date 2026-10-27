import assert from 'node:assert/strict'
import { it } from 'node:test'

import { BOT_AVATARS } from '../botAvatars.ts'

import { FACE_LINES } from './faceLines.ts'

it('gives every bot avatar exactly one short line', () => {
  assert.deepEqual(Object.keys(FACE_LINES).sort(), [...BOT_AVATARS].sort())
  for (const file of BOT_AVATARS) {
    const line = FACE_LINES[file]

    assert.ok(line.trim().length > 0, `${file} has no line`)
    assert.ok(line.length <= 40, `${file}: "${line}" is over 40 characters`)
  }
})
