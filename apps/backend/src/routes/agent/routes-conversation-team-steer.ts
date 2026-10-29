import { Hono } from 'hono'

import { descendantSessionIds } from '@/lib/agent/db/archive'
import { setTeamSteer } from '@/lib/agent/db/team-steer'
import { isLocalRuntimeId } from '@/lib/agent/devices/local-runtime/address'
import { dropRoomApprovals } from '@/lib/agent/devices/local-share-store'
import { AppError } from '@/lib/errors'

import {
  assertConversationWritable,
  readTeamIdCandidate,
  resolveVerifiedTeamId,
} from './team-scope'

import type { AuthVariables } from '@/middleware/auth'

// Its own sub-router so a test can mount it behind its own auth.
export const conversationTeamSteerRoutes = new Hono<{ Variables: AuthVariables }>()

// The owner's switch for a room on their own computer: teammates' turns run
// without asking each time. Off withdraws every yes given in the room, so the
// next teammate message waits for the owner again.
conversationTeamSteerRoutes.put('/conversations/:sessionId/team-steer', async (c) => {
  const sessionId = c.req.param('sessionId')
  const userId = c.get('userId')
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const teamId = await resolveVerifiedTeamId(c, readTeamIdCandidate(c, body.teamId))

  if (!teamId) throw new AppError(403, 'forbidden', 'Workspace membership is required')
  if (typeof body.enabled !== 'boolean')
    throw new AppError(400, 'invalid_request', 'enabled must be true or false')
  const conversation = await assertConversationWritable(sessionId, userId, teamId)

  if (!conversation) throw new AppError(404, 'not_found', 'Conversation not found')
  if (!isLocalRuntimeId(conversation.runtimeId))
    throw new AppError(409, 'not_on_local_runtime', 'This agent does not run on your computer')
  await setTeamSteer(sessionId, userId, body.enabled)
  if (!body.enabled) {
    const tree = await descendantSessionIds(sessionId, { userId, teamId })

    await dropRoomApprovals(userId, [sessionId, ...tree])
  }

  return c.json({ teamSteer: body.enabled })
})
