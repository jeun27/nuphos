import assert from 'node:assert/strict'
import { test } from 'node:test'

import { guestAgents, guestPeople, shownGuestChat, toolSummary } from './guestModel.ts'

import type { AgentGuestPerson, AgentGuestTreeEntry } from '../../../api/agent-types.ts'

const entry = (
  sessionId: string,
  extra: Partial<AgentGuestTreeEntry> = {},
): AgentGuestTreeEntry => ({
  sessionId,
  title: sessionId,
  ...extra,
})

test('the tree lists from the top, parents before children', () => {
  const tree = [
    entry('frontend', { parentSessionId: 'root', activeRun: { streamId: 's', startedAt: null } }),
    entry('tests', { parentSessionId: 'frontend', agentRuntime: 'codex' }),
    entry('root'),
    entry('review', { parentSessionId: 'root' }),
  ]
  const agents = guestAgents(tree)

  assert.deepEqual(
    agents.map((agent) => [agent.sessionId, agent.depth]),
    [
      ['root', 0],
      ['frontend', 1],
      ['tests', 2],
      ['review', 1],
    ],
  )
  assert.equal(agents[1].working, true)
  assert.equal(agents[2].provider, 'codex')
  assert.equal(agents[0].provider, 'claude-code')
})

test('a chat whose parent is not shared starts the list, and a loop still lists once', () => {
  assert.deepEqual(
    guestAgents([entry('sub', { parentSessionId: 'hidden' })]).map((agent) => agent.depth),
    [0],
  )
  const loop = [entry('a', { parentSessionId: 'b' }), entry('b', { parentSessionId: 'a' })]

  assert.deepEqual(
    guestAgents(loop).map((agent) => agent.sessionId),
    ['a', 'b'],
  )
})

test('the picked chat shows while it is in the tree, else the linked one', () => {
  const tree = [entry('root'), entry('frontend', { parentSessionId: 'root' })]

  assert.equal(shownGuestChat(null, tree, 'root'), 'root')
  assert.equal(shownGuestChat('frontend', tree, 'root'), 'frontend')
  assert.equal(shownGuestChat('gone', tree, 'root'), 'root')
})

test('people list owner, then teammates, then guests', () => {
  const person = (id: string, role: AgentGuestPerson['role']): AgentGuestPerson => ({
    id,
    name: id,
    isOwner: role === 'owner',
    role,
  })
  const people = [person('gabi', 'guest'), person('sam', 'reply'), person('bryan', 'owner')]

  assert.deepEqual(
    guestPeople(people).map((p) => p.id),
    ['bryan', 'sam', 'gabi'],
  )
})

test('tool calls fold to a count', () => {
  assert.equal(toolSummary([{ type: 'text' }]), null)
  assert.equal(toolSummary([{ type: 'tool' }, { type: 'text' }]), 'Used 1 tool')
  assert.equal(toolSummary([{ type: 'tool' }, { type: 'tool' }]), 'Used 2 tools')
})
