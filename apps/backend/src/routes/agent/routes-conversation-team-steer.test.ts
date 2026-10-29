import { beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { ObjectId } from 'mongodb'

import { roomTeamSteer } from '@/lib/agent/db/team-steer'
import { errorHandler } from '@/lib/errors'
import { useAgentDb } from '@/lib/test/doubles/agent-db'
import { useDb } from '@/lib/test/doubles/db'
import { useIdentity } from '@/lib/test/doubles/identity'
import { portabilityDb } from '@/lib/test/runtime-portability-db'

import type { AgentConversation } from '@/lib/agent/db'
import type * as dbActual from '@/lib/db'
import type { AuthVariables } from '@/middleware/auth'

// Bryan's room on his Mac, with a sub-agent below it. Sam was let in twice.
const TEAM = new ObjectId().toHexString()
const LOCAL = 'local_bryan_mac'
let viewer = 'bryan'
let memory = portabilityDb()
const row = (sessionId: string) =>
  memory.rows('agent_conversations').find((doc) => doc.sessionId === sessionId) as
    AgentConversation | undefined

useDb({ db: (() => memory) as unknown as typeof dbActual.db })
useAgentDb({ getConversationBySessionId: async (sessionId) => row(sessionId) ?? null })
useIdentity({
  getTeamMembership: async (_userId, teamId) =>
    teamId === TEAM ? ({ role: 'MEMBER' } as never) : null,
})

const { conversationTeamSteerRoutes } = await import('./routes-conversation-team-steer')
const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', async (c, next) => {
  c.set('userId', viewer)
  await next()
})
app.route('/', conversationTeamSteerRoutes)
app.onError(errorHandler)

const steer = (sessionId: string, enabled: unknown) =>
  app.request(`/conversations/${sessionId}/team-steer?teamId=${TEAM}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })

beforeEach(() => {
  viewer = 'bryan'
  memory = portabilityDb()
  const base = { userId: 'bryan', teamId: TEAM, runtimeId: LOCAL }

  memory
    .rows('agent_conversations')
    .push(
      { ...base, sessionId: 'room' },
      { ...base, sessionId: 'frontend', parentSessionId: 'room' },
      { ...base, sessionId: 'team-chat', runtimeId: 'managed-1' },
    )
  memory
    .rows('agent_device_share_approvals')
    .push(
      { ownerId: 'bryan', sessionId: 'room', actorId: 'sam', room: true, status: 'approved' },
      { ownerId: 'bryan', sessionId: 'frontend', actorId: 'sam', room: true, status: 'approved' },
      { ownerId: 'bryan', sessionId: 'elsewhere', actorId: 'sam', status: 'approved' },
    )
})

describe('letting the team steer a room on the owner’s computer', () => {
  test('one switch on the room covers its sub-agents', async () => {
    expect((await steer('room', true)).status).toBe(200)
    expect(await roomTeamSteer(row('frontend')!)).toBe(true)
    expect(await roomTeamSteer(row('team-chat')!)).toBe(false)
  })

  test('turning it off withdraws every yes given in the room, and only there', async () => {
    await steer('room', true)
    expect((await steer('room', false)).status).toBe(200)

    expect(row('room')?.teamSteer).toBeUndefined()
    expect(memory.rows('agent_device_share_approvals').map((a) => a.sessionId)).toEqual([
      'elsewhere',
    ])
  })

  test('only the owner flips it, and only for a chat on their own computer', async () => {
    viewer = 'sam'
    expect((await steer('room', true)).status).toBe(403)
    viewer = 'bryan'
    expect((await steer('team-chat', true)).status).toBe(409)
    expect((await steer('room', 'yes')).status).toBe(400)
  })
})
