import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  GROUP_AGENT_TURN_BUDGET,
  addableAgents,
  agentPostLink,
  agentsPaused,
  canRemoveAgent,
  groupFields,
  isAgentPost,
  isGroup,
  outsideEmail,
  roomAgents,
  roomHeadline,
} from './roomModel.ts'

import type { AgentConversation, AgentMessageMetadata } from '../../../api/agent-types.ts'

const conversation = (sessionId: string, extra: Partial<AgentConversation> = {}) =>
  ({
    sessionId,
    title: sessionId,
    firstMessage: '',
    messageCount: 1,
    createdAt: '',
    lastActiveAt: '',
    ...extra,
  }) as AgentConversation

const post = (extra: Partial<AgentMessageMetadata> = {}): AgentMessageMetadata => ({
  version: 1,
  sender: { type: 'agent', id: 'agent-lead', displayName: 'Lead' },
  source: 'agent.thread',
  sentAt: '2026-10-29T00:00:00Z',
  sourceSessionId: 'lead',
  ...extra,
})

test('a group is a conversation of kind group', () => {
  assert.equal(isGroup({ kind: 'group' }), true)
  assert.equal(isGroup(conversation('a')), false)
  assert.equal(isGroup(undefined), false)
  assert.deepEqual(groupFields(conversation('a')), {})
  assert.deepEqual(groupFields(conversation('g', { kind: 'group' })), {
    kind: 'group',
    agentSessionIds: [],
    agentTurns: 0,
  })
})

test('agents pause once the next post would overrun the budget', () => {
  assert.equal(GROUP_AGENT_TURN_BUDGET, 10)
  // Three agents: a post wakes the other two.
  assert.equal(agentsPaused(8, 3), false)
  assert.equal(agentsPaused(9, 3), true)
  // One or two agents: a post wakes at least one.
  assert.equal(agentsPaused(9, 1), false)
  assert.equal(agentsPaused(10, 2), true)
  assert.equal(agentsPaused(undefined, 3), false)
  assert.equal(agentsPaused(50, 0), false)
})

test('room agents take provider and access from the listed sessions', () => {
  const agents = roomAgents(
    [
      { sessionId: 'lead', title: 'Lead', ownerId: 'u1' },
      { sessionId: 'hidden', title: '', ownerId: 'u2' },
    ],
    [conversation('lead', { agentRuntime: 'codex', canManage: true })],
  )

  assert.deepEqual(
    agents.map(({ sessionId, provider, readable, managed }) => ({
      sessionId,
      provider,
      readable,
      managed,
    })),
    [
      { sessionId: 'lead', provider: 'codex', readable: true, managed: true },
      { sessionId: 'hidden', provider: undefined, readable: false, managed: false },
    ],
  )
  assert.equal(agents[1].title, 'Untitled agent')
})

test('the headline counts people and agents', () => {
  assert.equal(roomHeadline(2, 3), '2 people, 3 agents')
  assert.equal(roomHeadline(1, 1), '1 person, 1 agent')
})

test('only own or managed sessions outside the group may be added', () => {
  const listed = [
    conversation('mine', { isOwner: true }),
    conversation('managed', { isOwner: false, canManage: true }),
    conversation('theirs', { isOwner: false }),
    conversation('group', { isOwner: true, kind: 'group' }),
    conversation('archived', { isOwner: true, archivedAt: '2026-01-01' }),
    conversation('present', { isOwner: true }),
  ]

  assert.deepEqual(
    addableAgents(listed, ['present']).map((c) => c.sessionId),
    ['mine', 'managed'],
  )
})

test('the group owner, or the agent’s owner or manager, may remove it', () => {
  const [agent] = roomAgents([{ sessionId: 'a', title: 'A', ownerId: 'u2' }], [])

  assert.equal(canRemoveAgent(agent, 'u1', true), true)
  assert.equal(canRemoveAgent(agent, 'u2', false), true)
  assert.equal(canRemoveAgent(agent, 'u3', false), false)
  assert.equal(canRemoveAgent({ ...agent, managed: true }, 'u3', false), true)
})

test('agent posts link to their session only when the viewer can read it', () => {
  assert.equal(isAgentPost(post()), true)
  assert.equal(
    isAgentPost(post({ source: 'nuphos', sender: { type: 'user', id: 'u', displayName: 'U' } })),
    false,
  )
  assert.equal(isAgentPost(undefined), false)
  assert.equal(
    agentPostLink(post(), (id) => id === 'lead'),
    'lead',
  )
  assert.equal(
    agentPostLink(post(), () => false),
    null,
  )
  assert.equal(
    agentPostLink(post({ sourceSessionId: undefined }), () => true),
    null,
  )
})

test('an email that is no teammate’s needs a workspace invite first', () => {
  const members = [{ email: 'sam@example.com' }]

  assert.equal(outsideEmail('new@example.com', members), true)
  assert.equal(outsideEmail(' SAM@example.com ', members), false)
  assert.equal(outsideEmail('sam', members), false)
})
