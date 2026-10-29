import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  agentsBroughtBy,
  possessiveRuntime,
  queuedFromOthers,
  roomAgents,
  guestName,
  roomHeadline,
  roomIsShared,
  roomProviders,
  roomRootOf,
  roomSteering,
  runningRequester,
} from './roomModel.ts'

import type {
  AgentConversation,
  AgentConversationParticipant,
  AgentMessageMetadata,
} from '../../../api/agent-types.ts'

const chat = (sessionId: string, extra: Partial<AgentConversation> = {}): AgentConversation => ({
  sessionId,
  title: sessionId,
  firstMessage: '',
  messageCount: 1,
  createdAt: '2026-10-29T00:00:00Z',
  lastActiveAt: '2026-10-29T00:00:00Z',
  ...extra,
})

const tree = [
  chat('manager', { agentRuntime: 'claude-code' }),
  chat('builder', { parentSessionId: 'manager', agentRuntime: 'codex' }),
  chat('reviewer', { parentSessionId: 'builder', agentRuntime: 'claude-code' }),
  chat('unrelated', { agentRuntime: 'grok' }),
]

test('the room is the chat and every sub-agent below it, parents first', () => {
  const agents = roomAgents(tree[0], tree, (c) => c.sessionId === 'builder')

  assert.deepEqual(
    agents.map((a) => [a.sessionId, a.depth, a.working]),
    [
      ['manager', 0, false],
      ['builder', 1, true],
      ['reviewer', 2, false],
    ],
  )
  assert.deepEqual(roomProviders(agents), ['claude-code', 'codex'])
})

test('a parent loop in bad data does not hang the room', () => {
  const loop = [chat('a', { parentSessionId: 'b' }), chat('b', { parentSessionId: 'a' })]

  assert.equal(roomAgents(loop[0], loop, () => false).length, 2)
  assert.deepEqual(
    roomAgents(undefined, loop, () => false),
    [],
  )
})

test('the headline counts people and agents in plain words', () => {
  assert.equal(roomHeadline(2, 5), '2 people, 5 agents on')
  assert.equal(roomHeadline(1, 1), '1 person, 1 agent on')
  assert.equal(roomIsShared(1, 1), false)
  assert.equal(roomIsShared(2, 1), true)
  assert.equal(roomIsShared(1, 2), true)
})

test('guests join the headline only once there are some, and share the room', () => {
  assert.equal(roomHeadline(2, 4, 0), '2 people, 4 agents on')
  assert.equal(roomHeadline(2, 4, 1), '2 people, 1 guest, 4 agents on')
  assert.equal(roomHeadline(1, 1, 3), '1 person, 3 guests, 1 agent on')
  assert.equal(roomIsShared(1, 1, 1), true)
  assert.equal(roomIsShared(1, 1, 0), false)
  assert.equal(guestName({ email: 'gabi@example.com' }), 'gabi@example.com')
  assert.equal(guestName({ name: 'Gabi Guest', email: 'gabi@example.com' }), 'Gabi Guest')
})

const person = (id: string, isOwner: boolean): AgentConversationParticipant => ({
  id,
  name: id === 'bryan' ? 'Bryan Yeung' : 'Mira',
  email: '',
  isOwner,
  role: isOwner ? 'owner' : 'reply',
})

test('each person brings only the runtimes their own agents run on, labelled as theirs', () => {
  const agents = roomAgents(tree[0], tree, () => false)

  assert.deepEqual(agentsBroughtBy(person('bryan', true), agents), ['claude-code', 'codex'])
  assert.deepEqual(agentsBroughtBy(person('mira', false), agents), [])
  assert.equal(possessiveRuntime('Bryan Yeung', 'codex'), 'Bryan’s Codex')
})

const sent = (type: 'user' | 'agent', displayName: string) => ({
  role: 'user',
  metadata: {
    version: 1,
    sender: { type, id: displayName, displayName },
    source: type === 'user' ? 'nuphos' : 'agent.thread',
    sentAt: '2026-10-29T00:00:00Z',
  } as AgentMessageMetadata,
})

test('the running request belongs to the newest person who asked, not an agent report', () => {
  const messages = [sent('user', 'Bryan'), { role: 'assistant' }, sent('user', 'Mira')]

  assert.equal(runningRequester(messages)?.displayName, 'Mira')
  assert.equal(runningRequester([...messages, sent('agent', 'Builder')])?.displayName, 'Mira')
  assert.equal(runningRequester([{ role: 'assistant' }]), undefined)
})

test('a chat only one person talks in never names whose request it is', () => {
  assert.equal(runningRequester([sent('user', 'Bryan'), sent('user', 'Bryan')]), undefined)
})

test("teammates' queued messages keep their order and say who sent them", () => {
  const queue = [
    { id: '1', mine: false, text: 'Add SSO row', senderUserId: 'mira' },
    { id: '2', mine: true, text: 'Mine, editable elsewhere', senderUserId: 'bryan' },
    { id: '3', mine: false, text: 'From a removed teammate', senderUserId: 'gone' },
  ]

  assert.deepEqual(queuedFromOthers(queue, [person('bryan', true), person('mira', false)]), [
    { id: '1', text: 'Add SSO row', senderName: 'Mira' },
    { id: '3', text: 'From a removed teammate', senderName: 'A teammate' },
  ])
})

test('on its owner’s computer a room asks the owner, unless they let the team steer', () => {
  const people = [person('bryan', true), person('mira', false)]
  const local = (teamSteer: boolean) => [
    chat('manager', { runtimeId: 'local_bryan_mac', teamSteer }),
    chat('builder', { parentSessionId: 'manager', runtimeId: 'local_bryan_mac' }),
  ]
  const steering = (list: AgentConversation[]) =>
    roomSteering({ people, agents: roomAgents(list[0], list, () => false) })

  assert.deepEqual(steering(local(false)), { steering: 'ask', owner: people[0], rootId: 'manager' })
  assert.equal(steering(local(true)).steering, 'team')
  assert.equal(steering(tree).steering, 'open')
})

test('an agent row carries the pull requests and issues it linked, not chat threads', () => {
  const resource = (provider: string, id: string) =>
    ({ id, provider, title: id, url: '', state: 'open', linkedAt: '' }) as never
  const [agent] = roomAgents(
    chat('manager', { linkedResources: [resource('github', 'pr'), resource('slack', 'thread')] }),
    [],
    () => false,
  )

  assert.deepEqual(
    agent?.changes.map((change) => change.id),
    ['pr'],
  )
})

test('a sub-agent opens the same room as its manager, from the top of the tree', () => {
  assert.equal(roomRootOf('reviewer', tree)?.sessionId, 'manager')
  assert.equal(roomRootOf('manager', tree)?.sessionId, 'manager')
  assert.equal(roomRootOf('a', [chat('a', { parentSessionId: 'gone' })])?.sessionId, 'a')
  const loop = [chat('a', { parentSessionId: 'b' }), chat('b', { parentSessionId: 'a' })]

  assert.ok(roomRootOf('a', loop))
})
