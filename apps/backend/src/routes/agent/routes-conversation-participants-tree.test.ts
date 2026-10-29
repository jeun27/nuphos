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

// A manager conversation with a sub-agent below it and one below that: the
// whole tree must stay shared alike, and no sub-agent may reach past its parent.
const TEAM = new ObjectId().toHexString()
const OWNER = 'owner-user'
const ANN = 'ann-user'
const BO = 'bo-user'
const MEMBERS = [OWNER, ANN, BO]

let memory = portabilityDb()
const row = (sessionId: string) =>
  memory.rows('agent_conversations').find((doc) => doc.sessionId === sessionId) as
    AgentConversation | undefined

useDb({ db: (() => memory) as unknown as typeof dbActual.db })
useAgentDb({
  getReadableConversation: async (sessionId) => row(sessionId) ?? null,
  getConversationBySessionId: async (sessionId) => row(sessionId) ?? null,
})
useIdentity({
  getTeamMembership: async (userId, teamId) =>
    teamId === TEAM && MEMBERS.includes(userId) ? ({ role: 'MEMBER' } as never) : null,
  getTeamMembers: async () =>
    MEMBERS.map((id) => ({ id, name: id, email: `${id}@example.com`, avatarURL: '' })) as never,
})

const { conversationParticipantsRoutes } = await import('./routes-conversation-participants')
const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', async (c, next) => {
  c.set('userId', OWNER)
  await next()
})
app.route('/', conversationParticipantsRoutes)
app.onError(errorHandler)

function send(method: string, path: string, body?: Record<string, unknown>) {
  return app.request(`/conversations/${path}?teamId=${TEAM}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  memory = portabilityDb()
  const base = { userId: OWNER, teamId: TEAM, generalAccess: 'none' as const }

  memory
    .rows('agent_conversations')
    .push(
      { ...base, sessionId: 'manager' },
      { ...base, sessionId: 'worker', parentSessionId: 'manager' },
      { ...base, sessionId: 'nested', parentSessionId: 'worker' },
      { ...base, sessionId: 'elsewhere' },
    )
})

describe('sharing a conversation shares its sub-agents', () => {
  test('general access reaches every nested sub-agent and nothing else', async () => {
    expect((await send('PATCH', 'manager/access', { generalAccess: 'reply' })).status).toBe(200)

    expect(row('worker')?.generalAccess).toBe('reply')
    expect(row('nested')?.generalAccess).toBe('reply')
    expect(row('elsewhere')?.generalAccess).toBe('none')
  })

  test('inviting, changing a role and removing all follow down the tree', async () => {
    await send('POST', 'manager/participants', { userIds: [ANN, BO], role: 'view' })
    expect(row('nested')).toMatchObject({ participantIds: [ANN, BO], viewOnlyIds: [ANN, BO] })

    await send('PATCH', `manager/participants/${ANN}`, { role: 'manage' })
    expect(row('nested')).toMatchObject({ viewOnlyIds: [BO], managerIds: [ANN] })

    await send('DELETE', `manager/participants/${BO}`)
    expect(row('nested')?.participantIds).toEqual([ANN])
  })
})

describe('a sub-agent is never shared wider than its parent', () => {
  test('its team-wide access cannot exceed the parent', async () => {
    const response = await send('PATCH', 'worker/access', { generalAccess: 'view' })

    expect(response.status).toBe(409)
    expect(row('worker')?.generalAccess).toBe('none')
  })

  test('nobody is invited who cannot already open the parent, nor above their role there', async () => {
    expect((await send('POST', 'worker/participants', { userIds: [ANN] })).status).toBe(409)

    await send('POST', 'manager/participants', { userIds: [ANN], role: 'view' })
    expect(
      (await send('POST', 'worker/participants', { userIds: [ANN], role: 'reply' })).status,
    ).toBe(409)
    expect((await send('PATCH', `worker/participants/${ANN}`, { role: 'manage' })).status).toBe(409)
  })

  test('narrowing a sub-agent below its parent is allowed', async () => {
    await send('PATCH', 'manager/access', { generalAccess: 'reply' })

    expect((await send('PATCH', 'worker/access', { generalAccess: 'view' })).status).toBe(200)
    expect(row('nested')?.generalAccess).toBe('view')
  })
})
