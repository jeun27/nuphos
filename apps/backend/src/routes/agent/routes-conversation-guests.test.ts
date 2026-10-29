import { beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { ObjectId } from 'mongodb'

import { errorHandler } from '@/lib/errors'
import { useAgentDb } from '@/lib/test/doubles/agent-db'
import { useDb } from '@/lib/test/doubles/db'
import { useIdentity } from '@/lib/test/doubles/identity'
import { portabilityDb } from '@/lib/test/runtime-portability-db'

import type { AgentConversation } from '@/lib/agent/db'
import type * as dbActual from '@/lib/db'
import type { AuthVariables } from '@/middleware/auth'

// Bryan owns "Build the app" in team T with a Frontend sub-agent below it.
// Sam is a teammate; Gabi has an account but is not in the team.
const T = new ObjectId().toHexString()
const BRYAN = new ObjectId().toHexString()
const SAM = new ObjectId().toHexString()
const GABI = new ObjectId()
const NEWBIE = new ObjectId()
const MEMBERS = [BRYAN, SAM]
let viewer = { id: BRYAN, email: 'bryan@example.com' }
let memory = portabilityDb()
const row = (sessionId: string) =>
  memory.rows('agent_conversations').find((doc) => doc.sessionId === sessionId) as
    AgentConversation | undefined

useDb({ db: (() => memory) as unknown as typeof dbActual.db })
useAgentDb({
  getConversationBySessionId: async (sessionId) => row(sessionId) ?? null,
  getConversationWithMessages: async (sessionId) =>
    row(sessionId) ? { conversation: row(sessionId)!, messages: [] } : null,
})
useIdentity({
  getTeamMembership: async (userId, teamId) =>
    teamId === T && MEMBERS.includes(userId) ? ({ role: 'ADMINISTRATOR' } as never) : null,
  getTeamMembers: async () =>
    MEMBERS.map((id) => ({
      id,
      name: id === BRYAN ? 'Bryan' : 'Sam',
      email: '',
      avatarURL: '',
    })) as never,
})

const { conversationGuestRoutes } = await import('./routes-conversation-guests')
const { grantCarriedConversations } = await import('@/lib/team-invitation-conversations')
const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', async (c, next) => {
  c.set('userId', viewer.id)
  c.set('userEmail', viewer.email)
  c.set('userName', 'Bryan')
  await next()
})
app.route('/', conversationGuestRoutes)
app.onError(errorHandler)

const invite = (email: string) =>
  app.request(`/conversations/room/guests?teamId=${T}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
const remove = (key: string) =>
  app.request(`/conversations/room/guests/${encodeURIComponent(key)}?teamId=${T}`, {
    method: 'DELETE',
  })
const view = (sessionId = 'room') => app.request(`/guest/conversations/${sessionId}`)

beforeEach(() => {
  viewer = { id: BRYAN, email: 'bryan@example.com' }
  memory = portabilityDb()
  const base = { userId: BRYAN, teamId: T, generalAccess: 'reply' as const, title: 'Build the app' }

  memory
    .rows('agent_conversations')
    .push(
      { ...base, sessionId: 'room' },
      { ...base, sessionId: 'frontend', parentSessionId: 'room', title: 'Frontend' },
      { ...base, sessionId: 'elsewhere', title: 'Another chat' },
    )
  memory
    .rows('users')
    .push(
      { _id: GABI, email: 'gabi@example.com', name: 'Gabi', avatarURL: '' },
      { _id: new ObjectId(SAM), email: 'sam@example.com', name: 'Sam', avatarURL: '' },
    )
})

describe('inviting a guest', () => {
  test('someone with an account can read the chat and its sub-agents at once', async () => {
    expect((await invite('Gabi@Example.com ')).status).toBe(200)
    expect(row('room')?.guestIds).toEqual([GABI.toHexString()])
    expect(row('frontend')?.guestIds).toEqual([GABI.toHexString()])
    expect(row('elsewhere')?.guestIds).toBeUndefined()
    expect(memory.rows('agent_events').map((event) => event.event)).toContain(
      'agent.conversation.guest_invited',
    )

    viewer = { id: GABI.toHexString(), email: 'gabi@example.com' }
    const body = (await (await view()).json()) as {
      tree: { sessionId: string }[]
      people: Record<string, unknown>[]
    }

    expect(body.tree.map((node) => node.sessionId)).toEqual(['room', 'frontend'])
    expect(body.people.every((person) => !('email' in person))).toBe(true)
    expect((await view('elsewhere')).status).toBe(404)
  })

  test('someone with no account yet claims it when they sign in and open the link', async () => {
    await invite('newbie@example.com')
    expect(row('room')?.guestIds).toBeUndefined()

    viewer = { id: NEWBIE.toHexString(), email: 'newbie@example.com' }
    expect((await view()).status).toBe(200)
    expect(row('frontend')?.guestIds).toEqual([NEWBIE.toHexString()])
    expect(memory.rows('agent_guest_invitations')).toEqual([])
  })

  test('a teammate is added as a teammate, not a guest, and only the owner invites', async () => {
    expect((await invite('sam@example.com')).status).toBe(409)
    expect((await invite('not-an-email')).status).toBe(400)
    viewer = { id: SAM, email: 'sam@example.com' }
    expect((await invite('gabi@example.com')).status).toBe(403)
  })

  test('nobody else reads the chat through the guest view', async () => {
    viewer = { id: GABI.toHexString(), email: 'gabi@example.com' }
    expect((await view()).status).toBe(404)
    viewer = { id: SAM, email: 'sam@example.com' }
    expect((await view()).status).toBe(404)
  })
})

describe('removing a guest', () => {
  test('takes them out of the whole tree, and records it', async () => {
    await invite('gabi@example.com')
    expect((await remove(GABI.toHexString())).status).toBe(200)

    expect(row('room')?.guestIds).toEqual([])
    expect(row('frontend')?.guestIds).toEqual([])
    viewer = { id: GABI.toHexString(), email: 'gabi@example.com' }
    expect((await view()).status).toBe(404)
    expect(memory.rows('agent_events').map((event) => event.event)).toContain(
      'agent.conversation.guest_removed',
    )
  })

  test('withdraws an invite nobody has claimed yet', async () => {
    await invite('newbie@example.com')
    expect((await remove('newbie@example.com')).status).toBe(200)
    expect(memory.rows('agent_guest_invitations')).toEqual([])
    expect((await remove('nobody@example.com')).status).toBe(404)
  })
})

test('a guest who joins the team becomes a full member of the room', async () => {
  await invite('gabi@example.com')
  const invitation = {
    _id: new ObjectId(),
    teamId: new ObjectId(T),
    inviterId: new ObjectId(BRYAN),
    inviteeEmail: 'gabi@example.com',
    invitedAt: new Date(),
    conversations: [{ sessionId: 'room', role: 'reply' as const }],
  }

  MEMBERS.push(GABI.toHexString())
  expect(await grantCarriedConversations(invitation as never, GABI.toHexString())).toBe('room')
  MEMBERS.pop()

  expect(row('room')).toMatchObject({ participantIds: [GABI.toHexString()], guestIds: [] })
  expect(memory.rows('agent_events').map((event) => event.event)).toContain(
    'agent.conversation.guest_upgraded',
  )
})
