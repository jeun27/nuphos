import assert from 'node:assert/strict'
import { test } from 'node:test'

import { publishRuntimeStates } from './agentRuntimeStates.ts'
import { setDockSessions, startDockActivity } from './dockActivity.ts'

let revision = 0
const publish = (sessionId: string, state: 'active' | 'idle') =>
  publishRuntimeStates([[sessionId, { state, revision: ++revision } as never]])

test('reports only changes in whether one of my chats runs', () => {
  const sent: boolean[] = []

  setDockSessions(['a1', 'a2'])
  const stop = startDockActivity((active) => sent.push(active))

  publish('a1', 'active')
  publish('a2', 'active')
  publish('a1', 'idle')
  publish('a2', 'idle')
  stop()
  publish('a1', 'active')
  assert.deepEqual(sent, [true, false])
  publish('a1', 'idle')
  setDockSessions([])
})

test("a teammate's running session never animates the Dock", () => {
  const sent: boolean[] = []

  setDockSessions(['b1'])
  const stop = startDockActivity((active) => sent.push(active))

  // Listed by team-wide search: stored, but not one of my chats.
  publish('teammate-1', 'active')
  assert.deepEqual(sent, [])
  stop()
  setDockSessions([])
})

test('a stale active entry stops counting once the sidebar no longer lists it', () => {
  const sent: boolean[] = []

  setDockSessions(['c1'])
  const stop = startDockActivity((active) => sent.push(active))

  publish('c1', 'active')
  // Switching teams lists other chats; c1's last snapshot stays active in the store.
  setDockSessions(['other-team-chat'])
  assert.deepEqual(sent, [true, false])
  stop()
  setDockSessions([])
})
