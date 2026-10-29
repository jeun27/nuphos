import { Hono } from 'hono'
import { ObjectId } from 'mongodb'
import { z } from 'zod'

import { getConversationBySessionId } from '@/lib/agent/db'
import {
  addGuest,
  dropGuestInvitation,
  inviteGuestByEmail,
  normalizeEmail,
  removeGuest,
} from '@/lib/agent/db/guests'
import { AppError } from '@/lib/errors'
import { getTeamMembership } from '@/lib/identity'
import { users } from '@/lib/identity/shared'

import { serializeAccess } from './conversation-access-view'
import { sendGuestInvitationEmail } from './guest-invitation-email'
import { guestConversationView } from './guest-view'
import {
  assertConversationWritable,
  readTeamIdCandidate,
  resolveVerifiedTeamId,
} from './team-scope'

import type { AuthVariables } from '@/middleware/auth'
import type { Context } from 'hono'

// Its own sub-router so a test can mount it behind its own auth.
export const conversationGuestRoutes = new Hono<{ Variables: AuthVariables }>()

const EMAIL = z.string().email()

/** Only the owner lets a guest in or out, in the conversation's own team. */
async function ownedConversation(c: Context<{ Variables: AuthVariables }>, candidate?: unknown) {
  const teamId = await resolveVerifiedTeamId(c, readTeamIdCandidate(c, candidate))

  if (!teamId) throw new AppError(403, 'forbidden', 'Workspace membership is required')
  const conversation = await assertConversationWritable(
    c.req.param('sessionId') ?? '',
    c.get('userId'),
    teamId,
  )

  if (!conversation) throw new AppError(404, 'not_found', 'Conversation not found')

  return { conversation, teamId }
}

// Invite by email: someone with an account becomes a guest at once; anyone
// else gets an invite they claim when they sign in and open the chat.
conversationGuestRoutes.post('/conversations/:sessionId/guests', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const { conversation, teamId } = await ownedConversation(c, body.teamId)
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''

  if (!EMAIL.safeParse(email).success)
    throw new AppError(400, 'invalid_request', 'email must be an address')
  const account = await users().findOne({ email }, { projection: { _id: 1 } })
  const accountId = account?._id.toHexString()

  if (accountId && (await getTeamMembership(accountId, teamId)))
    throw new AppError(
      409,
      'already_team_member',
      'They’re already in this team. Add them as a teammate instead.',
    )
  if (accountId === conversation.userId)
    throw new AppError(400, 'invalid_request', 'You already own this chat')
  if (accountId) await addGuest(conversation, accountId, c.get('userId'))
  else await inviteGuestByEmail(conversation, email, c.get('userId'))
  await sendGuestInvitationEmail({
    to: email,
    inviterName: c.get('userName'),
    title: conversation.title,
    teamId,
    sessionId: conversation.sessionId,
  })

  return c.json(
    await serializeAccess((await getConversationBySessionId(conversation.sessionId))!, teamId),
  )
})

// The key is the guest's user id, or the email of an invite not yet claimed.
conversationGuestRoutes.delete('/conversations/:sessionId/guests/:guestKey', async (c) => {
  const { conversation, teamId } = await ownedConversation(c)
  const key = decodeURIComponent(c.req.param('guestKey'))
  const isGuest = ObjectId.isValid(key) && conversation.guestIds?.includes(key)

  if (isGuest) await removeGuest(conversation, key, c.get('userId'))
  else if (!(await dropGuestInvitation(conversation.sessionId, key)))
    throw new AppError(404, 'not_found', 'That person is not a guest here')

  return c.json(
    await serializeAccess((await getConversationBySessionId(conversation.sessionId))!, teamId),
  )
})

// The guest's only way in: one chat and the tree below it, read-only, with no
// team scope at all. Anyone who is not a guest of it gets the same 404 as a
// chat that does not exist.
conversationGuestRoutes.get('/guest/conversations/:sessionId', async (c) => {
  const view = await guestConversationView(
    c.req.param('sessionId'),
    c.get('userId'),
    c.get('userEmail'),
  )

  if (!view) throw new AppError(404, 'not_found', 'Conversation not found')

  return c.json(view)
})
