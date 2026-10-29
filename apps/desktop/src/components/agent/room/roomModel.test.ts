import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  GROUP_AGENT_TURN_BUDGET,
  agentPostLink,
  agentsPaused,
  groupFields,
  isAgentPost,
  isGroup,
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
