import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cleanCode, completesCode, singleFlight } from './codeEntry.ts'

describe('cleanCode', () => {
  it('keeps the first six digits of a typed, pasted or spaced code', () => {
    assert.equal(cleanCode('123 456'), '123456')
    assert.equal(cleanCode('code: 987-654-3'), '987654')
    assert.equal(cleanCode('12a'), '12')
  })
})

describe('completesCode', () => {
  it('submits when the sixth digit lands', () => {
    assert.ok(completesCode('12345', '123456'))
    assert.ok(completesCode('', '123456'), 'pasted or autofilled in one go')
  })

  it('does not submit a partial code or the same full code again', () => {
    assert.ok(!completesCode('1234', '12345'))
    assert.ok(!completesCode('123456', '123456'))
  })

  it('submits a different full code pasted over a wrong one', () => {
    assert.ok(completesCode('111111', '123456'))
  })
})

describe('singleFlight', () => {
  it('sends one request for an auto-submit and an Enter right after it', async () => {
    const calls: string[] = []
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const verify = singleFlight(async (code: string) => {
      calls.push(code)
      await gate
    })

    const auto = verify('123456')
    const enter = verify('123456')

    release?.()
    await Promise.all([auto, enter])
    assert.deepEqual(calls, ['123456'])
  })

  it('lets a retry through once a failed request settles', async () => {
    const calls: string[] = []
    const verify = singleFlight(async (code: string) => {
      calls.push(code)
      throw new Error('Invalid code')
    })

    await assert.rejects(verify('111111'))
    await assert.rejects(verify('111111'))
    assert.deepEqual(calls, ['111111', '111111'])
  })
})
