import assert from 'node:assert/strict'
import test from 'node:test'

import { LOCAL_AGENT_SHARING_NOTE, localAgentMoveWarning } from './localAgentSharing.ts'

test('a move onto a Local Agent says teammates’ messages then wait for the owner', () => {
  // A teammate's turn there waits for the owner's yes and runs as the owner,
  // so the move says both rather than handing over the computer silently.
  const warning = localAgentMoveWarning({ kind: 'local' })

  assert.ok(warning)
  assert.match(warning, /wait for your OK/)
  assert.match(warning, /your agent sign-in/)
  assert.doesNotMatch(warning, /run commands on your computer/)
})

test('the Share note says how teammates send and whose sign-in their turns use', () => {
  assert.match(LOCAL_AGENT_SHARING_NOTE, /waits for your OK/)
  assert.match(LOCAL_AGENT_SHARING_NOTE, /your agent sign-in/)
  assert.doesNotMatch(LOCAL_AGENT_SHARING_NOTE, /only you can send messages/)
})

test('a move onto a teammate’s shared computer says whose it is and whether they approve', () => {
  const local = { ownerUserId: 'mate', deviceId: 'mac', deviceLabel: 'Mac', signedIn: true }
  const approve = localAgentMoveWarning({
    kind: 'local',
    local: { ...local, shared: { level: 'approve' } },
  })
  const full = localAgentMoveWarning({
    kind: 'local',
    local: { ...local, shared: { level: 'full' } },
  })

  assert.match(approve ?? '', /teammate’s own computer/)
  assert.match(approve ?? '', /They approve this agent/)
  assert.doesNotMatch(full ?? '', /They approve/)
})

test('moves onto hosted agents need no Local Agent consent', () => {
  assert.equal(localAgentMoveWarning({ kind: 'managed' }), undefined)
  assert.equal(localAgentMoveWarning({ kind: 'external' }), undefined)
})
