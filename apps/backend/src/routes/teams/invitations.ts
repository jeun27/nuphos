import { MongoServerError, ObjectId } from 'mongodb'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { parseObjectId } from '@/lib/objectid'
import {
  assertMayShareConversation,
  invitationConversationSchema,
} from '@/lib/team-invitation-conversations'
import {
  normalizeInviteeEmail,
  sendTeamInvitationEmail,
  serializeTeamInvitation,
} from '@/lib/team-invitations'
import { zv } from '@/lib/validate'
import { requireTeamRole } from '@/middleware/auth'
import { teamInvitations } from '@/models'

import type { TeamAuthVariables } from '@/middleware/auth'
import type { TeamInvitation } from '@/models'
import type { Context, Hono } from 'hono'

const createInvitationSchema = z.object({
  inviteeEmail: z.string().email().transform(normalizeInviteeEmail),
  // Share-dialog invites carry the chat, so accepting opens it with no workspace hunt.
  conversation: invitationConversationSchema.optional(),
})

const alreadyInvited = (email: string) =>
  new AppError(409, 'invitation_already_exists', `${email} already has a pending invitation`)

// Never throws: the invitation is already committed and visible in-app on sign-in.
function notifyInvitee(c: Context<{ Variables: TeamAuthVariables }>, inviteeEmail: string) {
  return sendTeamInvitationEmail({
    to: inviteeEmail,
    teamName: c.get('team').name,
    inviterName: c.get('userName') ?? '',
  })
}

export function registerTeamInvitationRoutes(teamScoped: Hono<{ Variables: TeamAuthVariables }>) {
  teamScoped.get('/invitations', async (c) => {
    const teamId = parseObjectId(c.get('teamId'), 'teamId')
    const invitations = await teamInvitations()
      .find({ teamId })
      .sort({ invitedAt: -1 })
      .limit(200)
      .toArray()

    // Which chats an invite carries, and with what role, is for admins to see.
    const admin = c.get('teamRole') === 'ADMINISTRATOR'

    return c.json({
      invitations: invitations.map((invitation) =>
        serializeTeamInvitation(admin ? invitation : { ...invitation, conversations: undefined }),
      ),
    })
  })

  teamScoped.post(
    '/invitations',
    requireTeamRole('ADMINISTRATOR'),
    zv('json', createInvitationSchema),
    async (c) => {
      const { inviteeEmail, conversation: carried } = c.req.valid('json')
      const conversation = carried ? { ...carried, inviterId: c.get('userId') } : undefined
      const teamId = parseObjectId(c.get('teamId'), 'teamId')

      if (conversation) {
        await assertMayShareConversation(conversation.sessionId, c.get('userId'), c.get('teamId'))
      }
      const pending = {
        teamId,
        inviteeEmail,
        acceptedAt: { $exists: false },
        rejectedAt: { $exists: false },
      }
      // Inviting someone already invited into another chat adds the chat to
      // their pending invitation and sends it again, rather than refusing.
      const mergeIntoPending = async () => {
        if (!conversation) return null
        const merged = await teamInvitations().findOneAndUpdate(
          pending,
          { $addToSet: { conversations: conversation } },
          { returnDocument: 'after' },
        )

        return merged
          ? c.json({
              invitation: serializeTeamInvitation(merged),
              emailSent: await notifyInvitee(c, inviteeEmail),
            })
          : null
      }

      if (await teamInvitations().findOne(pending)) {
        const merged = await mergeIntoPending()

        if (merged) return merged
        throw alreadyInvited(inviteeEmail)
      }

      const invitation: TeamInvitation = {
        _id: new ObjectId(),
        inviterId: parseObjectId(c.get('userId'), 'userId'),
        teamId,
        invitedAt: new Date(),
        inviteeEmail,
        ...(conversation ? { conversations: [conversation] } : {}),
      }

      try {
        await teamInvitations().insertOne(invitation)
      } catch (err) {
        if (err instanceof MongoServerError && err.code === 11000) {
          const merged = await mergeIntoPending()

          if (merged) return merged
          throw alreadyInvited(inviteeEmail)
        }
        throw err
      }
      // Fail-soft: a delivery failure, or email being unconfigured, is reported
      // via emailSent and never fails the request.
      const emailSent = await notifyInvitee(c, inviteeEmail)

      return c.json({ invitation: serializeTeamInvitation(invitation), emailSent }, 201)
    },
  )

  teamScoped.delete('/invitations/:invitationId', requireTeamRole('ADMINISTRATOR'), async (c) => {
    const invitationId = c.req.param('invitationId')

    if (!ObjectId.isValid(invitationId)) {
      throw new AppError(400, 'invalid_id', `Invalid invitationId: ${invitationId}`)
    }

    const rejectedAt = new Date()
    const invitation = await teamInvitations().findOneAndUpdate(
      {
        _id: new ObjectId(invitationId),
        teamId: parseObjectId(c.get('teamId'), 'teamId'),
        acceptedAt: { $exists: false },
        rejectedAt: { $exists: false },
      },
      { $set: { rejectedAt } },
      { returnDocument: 'after' },
    )

    if (!invitation) {
      throw new AppError(404, 'invitation_not_found', 'Invitation not found')
    }

    return c.json({ invitation: serializeTeamInvitation(invitation) })
  })
}
