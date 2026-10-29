import { randomUUID } from 'node:crypto'

import { db } from '@/lib/db'

import { applyShareChange } from './access-tree'
import { syncDescendantAccess } from './access-tree-sync'
import { recordAgentEvent } from './events'
import { agentConversations } from './shared'

import type { AgentConversation } from './shared'

// A guest is someone outside the team the owner lets read one chat and the
// sub-agents below it, nothing else. Being in `guestIds` is the whole grant:
// the team routes never see guests, so everything else stays closed to them.

/** An invite to someone with no account yet, claimed when they first sign in and open the chat. */
export type GuestInvitation = {
  _id: string
  email: string
  sessionId: string
  teamId: string
  ownerId: string
  invitedAt: Date
}

export const guestInvitations = () => db().collection<GuestInvitation>('agent_guest_invitations')

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

const treeScope = (conversation: Pick<AgentConversation, 'userId' | 'teamId'>) => ({
  userId: conversation.userId,
  ...(conversation.teamId ? { teamId: conversation.teamId } : {}),
})

/** Let `userId` read this chat and its tree; the audit log records who did it. */
export async function addGuest(
  conversation: AgentConversation,
  userId: string,
  actorId: string,
): Promise<void> {
  await agentConversations().updateOne(
    { sessionId: conversation.sessionId },
    { $addToSet: { guestIds: userId } },
  )
  await syncDescendantAccess(conversation.sessionId, treeScope(conversation))
  recordAgentEvent({
    conversationId: conversation.sessionId,
    event: 'agent.conversation.guest_invited',
    userId: actorId,
    data: { guestId: userId },
  })
}

/**
 * Take a guest out of this chat and its tree. The tree is narrowed first, so
 * a failure part-way leaves them with less access, never more.
 */
export async function removeGuest(
  conversation: AgentConversation,
  userId: string,
  actorId: string,
  event = 'agent.conversation.guest_removed',
): Promise<void> {
  const scope = treeScope(conversation)

  await syncDescendantAccess(conversation.sessionId, scope, {
    grant: applyShareChange(conversation, { kind: 'guest', userId, present: false }),
    narrowOnly: true,
  })
  await agentConversations().updateOne(
    { sessionId: conversation.sessionId },
    { $pull: { guestIds: userId } },
  )
  await syncDescendantAccess(conversation.sessionId, scope)
  recordAgentEvent({
    conversationId: conversation.sessionId,
    event,
    userId: actorId,
    data: { guestId: userId },
  })
}

export async function inviteGuestByEmail(
  conversation: AgentConversation,
  email: string,
  actorId: string,
): Promise<void> {
  const key = { email: normalizeEmail(email), sessionId: conversation.sessionId }

  await guestInvitations().updateOne(
    key,
    {
      $setOnInsert: {
        ...key,
        _id: randomUUID(),
        teamId: conversation.teamId ?? '',
        ownerId: conversation.userId,
        invitedAt: new Date(),
      },
    },
    { upsert: true },
  )
  recordAgentEvent({
    conversationId: conversation.sessionId,
    event: 'agent.conversation.guest_invited',
    userId: actorId,
    data: { email: normalizeEmail(email), pending: true },
  })
}

export async function pendingGuestEmails(sessionId: string): Promise<string[]> {
  const pending = await guestInvitations().find({ sessionId }).toArray()

  return pending.map((invite) => invite.email)
}

export async function dropGuestInvitation(sessionId: string, email: string): Promise<boolean> {
  const result = await guestInvitations().deleteOne({ sessionId, email: normalizeEmail(email) })

  return result.deletedCount > 0
}

/** A newly signed-in person's pending invite to this chat becomes their guest grant. */
export async function claimGuestInvitation(
  sessionId: string,
  userId: string,
  email: string,
): Promise<void> {
  const invite = await guestInvitations().findOne({ sessionId, email: normalizeEmail(email) })
  const conversation = invite
    ? await agentConversations().findOne({ sessionId, userId: invite.ownerId })
    : null

  if (!invite || !conversation) return
  await guestInvitations().deleteOne({ _id: invite._id })
  await addGuest(conversation, userId, invite.ownerId)
}
