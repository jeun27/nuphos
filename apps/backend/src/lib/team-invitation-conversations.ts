import { z } from 'zod'

import { getConversationBySessionId } from '@/lib/agent/db'
import { inviteExceedsParent } from '@/lib/agent/db/access-tree'
import { markOwnAccess, syncDescendantAccess } from '@/lib/agent/db/access-tree-sync'
import { inviteConversationParticipants } from '@/lib/agent/db/participants'
import { AppError } from '@/lib/errors'

import type { InvitationConversation, TeamInvitation } from '@/models'

/** A chat a team invitation carries: the invitee joins it, with this role, on accepting. */
export const invitationConversationSchema = z.object({
  sessionId: z.string().min(1).max(200),
  role: z.enum(['view', 'reply', 'manage']).default('reply'),
})

/** Only a chat's owner brings someone into it, as on the participants routes. */
export async function assertMayShareConversation(
  sessionId: string,
  inviterId: string,
  teamId: string,
): Promise<void> {
  const conversation = await getConversationBySessionId(sessionId)

  if (!conversation || conversation.teamId !== teamId)
    throw new AppError(404, 'not_found', 'Conversation not found')
  if (conversation.userId !== inviterId)
    throw new AppError(
      403,
      'conversation_not_shareable',
      'Only the owner of this chat can invite someone into it',
    )
}

/** One entry per chat; a later invite into the same chat sets the role. */
function carriedConversations(invitation: TeamInvitation): InvitationConversation[] {
  const bySession = new Map<string, InvitationConversation>()

  for (const entry of invitation.conversations ?? []) bySession.set(entry.sessionId, entry)

  return [...bySession.values()]
}

async function grantOne(invitation: TeamInvitation, entry: InvitationConversation, userId: string) {
  const conversation = await getConversationBySessionId(entry.sessionId)

  if (!conversation || conversation.teamId !== invitation.teamId.toHexString()) return false
  // Re-checked on accepting: the chat must still be the one who put it on the invite.
  if (conversation.userId !== (entry.inviterId ?? invitation.inviterId.toHexString())) return false
  const parent = conversation.parentSessionId
    ? await getConversationBySessionId(conversation.parentSessionId)
    : null

  // A sub-agent is never shared further than the conversation that runs it.
  if (parent && inviteExceedsParent(parent, userId, entry.role)) return false
  const actorId = conversation.userId
  const updated = await inviteConversationParticipants(
    entry.sessionId,
    actorId,
    [userId],
    entry.role,
  )

  if (!updated) return false
  if (conversation.parentSessionId) await markOwnAccess(conversation.sessionId)
  await syncDescendantAccess(entry.sessionId, {
    userId: conversation.userId,
    ...(conversation.teamId ? { teamId: conversation.teamId } : {}),
  })

  return true
}

/**
 * Called once the invitee is in the team: add them to every chat the invitation
 * carried. Joining the team already happened, so one chat failing is logged, not
 * thrown. Answers with the first chat they were added to, for the app to open.
 */
export async function grantCarriedConversations(
  invitation: TeamInvitation,
  userId: string,
): Promise<string | undefined> {
  let first: string | undefined

  for (const entry of carriedConversations(invitation)) {
    try {
      if ((await grantOne(invitation, entry, userId)) && !first) first = entry.sessionId
    } catch (err) {
      console.error('team-invitations: failed to add the invitee to a carried chat', err)
    }
  }

  return first
}
