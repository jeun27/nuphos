import { beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { ObjectId } from 'mongodb'

import { errorHandler } from '@/lib/errors'
import { useAgentDb } from '@/lib/test/doubles/agent-db'
import { useDb } from '@/lib/test/doubles/db'
import { portabilityDb } from '@/lib/test/runtime-portability-db'

import type { AgentConversation } from '@/lib/agent/db'
import type * as dbActual from '@/lib/db'
import type { TeamAuthVariables } from '@/middleware/auth'
import type { TeamInvitation } from '@/models'

const TEAM = new ObjectId().toHexString()
const OWNER = new ObjectId().toHexString()
const OTHER_ADMIN = new ObjectId().toHexString()
const SHANT = 'shant-user'

let viewer = OWNER
let memory = portabilityDb()
const conversations = () => memory.rows('agent_conversations') as AgentConversation[]

useDb({ db: (() => memory) as unknown as typeof dbActual.db })
useAgentDb({
  getConversationBySessionId: async (sessionId) =>
    conversations().find((row) => row.sessionId === sessionId) ?? null,
})

const { registerTeamInvitationRoutes } = await import('./invitations')
const { grantCarriedConversations } = await import('@/lib/team-invitation-conversations')
const app = new Hono<{ Variables: TeamAuthVariables }>()

app.use('*', async (c, next) => {
  c.set('userId', viewer)
  c.set('teamId', TEAM)
  c.set('teamRole', 'ADMINISTRATOR')
  c.set('team', { id: TEAM, name: 'Workspace' } as never)
  await next()
})
registerTeamInvitationRoutes(app)
app.onError(errorHandler)

async function invite(body: Record<string, unknown>) {
  const response = await app.request('/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteeEmail: 'Shant@Example.com', ...body }),
  })

  return { status: response.status, body: (await response.json()) as Record<string, any> }
}

const stored = () => memory.rows('team_invitations') as TeamInvitation[]

beforeEach(() => {
  viewer = OWNER
  memory = portabilityDb()
  conversations().push(
    { sessionId: 'chat-a', userId: OWNER, teamId: TEAM } as AgentConversation,
    { sessionId: 'chat-b', userId: OWNER, teamId: TEAM } as AgentConversation,
    { sessionId: 'elsewhere', userId: OWNER, teamId: new ObjectId().toHexString() } as never,
  )
})

describe('team invitation carrying a chat', () => {
  test('the schema defaults the role to reply and refuses an unknown one', async () => {
    const created = await invite({ conversation: { sessionId: 'chat-a' } })

    expect(created.status).toBe(201)
    expect(created.body.invitation.conversations).toEqual([{ sessionId: 'chat-a', role: 'reply' }])
    expect((await invite({ conversation: { sessionId: 'chat-b', role: 'admin' } })).status).toBe(
      400,
    )
    expect((await invite({ conversation: { role: 'view' } })).status).toBe(400)
  })

  test('only someone who manages the chat may carry it, and only a chat in this team', async () => {
    viewer = OTHER_ADMIN
    expect((await invite({ conversation: { sessionId: 'chat-a' } })).status).toBe(403)
    conversations()[0]!.participantIds = [OTHER_ADMIN]
    conversations()[0]!.managerIds = [OTHER_ADMIN]
    expect((await invite({ conversation: { sessionId: 'chat-a' } })).status).toBe(201)
    viewer = OWNER
    expect((await invite({ conversation: { sessionId: 'elsewhere' } })).status).toBe(404)
    expect((await invite({ conversation: { sessionId: 'missing' } })).status).toBe(404)
  })

  test('a second chat joins the pending invitation instead of a 409', async () => {
    expect((await invite({ conversation: { sessionId: 'chat-a' } })).status).toBe(201)
    const merged = await invite({ conversation: { sessionId: 'chat-b', role: 'view' } })

    expect(merged.status).toBe(200)
    expect((await invite({ conversation: { sessionId: 'chat-b', role: 'view' } })).status).toBe(200)
    expect(stored()).toHaveLength(1)
    expect(stored()[0]!.conversations).toEqual([
      { sessionId: 'chat-a', role: 'reply' },
      { sessionId: 'chat-b', role: 'view' },
    ])
    expect(merged.body.invitation.inviteeEmail).toBe('shant@example.com')
    // Without a chat, a repeat invite is still a conflict.
    expect((await invite({})).status).toBe(409)
  })

  test('accepting adds the invitee to each carried chat with its role', async () => {
    await invite({ conversation: { sessionId: 'chat-a', role: 'view' } })
    await invite({ conversation: { sessionId: 'chat-b', role: 'manage' } })
    await invite({ conversation: { sessionId: 'elsewhere' } }).catch(() => {})
    const first = await grantCarriedConversations(stored()[0]!, SHANT)
    const [a, b] = conversations()

    expect(first).toBe('chat-a')
    expect(a!.participantIds).toEqual([SHANT])
    expect(a!.viewOnlyIds).toEqual([SHANT])
    expect(b!.participantIds).toEqual([SHANT])
    expect(b!.managerIds).toEqual([SHANT])
    expect(a!.timelineEvents?.[0]).toMatchObject({ kind: 'participant_invited', targetId: SHANT })
  })

  test('accepting skips a chat that has since left the team', async () => {
    await invite({ conversation: { sessionId: 'chat-a' } })
    conversations()[0]!.teamId = new ObjectId().toHexString()

    expect(await grantCarriedConversations(stored()[0]!, SHANT)).toBeUndefined()
    expect(conversations()[0]!.participantIds).toBeUndefined()
  })
})
