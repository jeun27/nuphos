import { ObjectId } from 'mongodb'

import { generalAccessOf, participantRole } from '@/lib/agent/db/access'
import { pendingGuestEmails } from '@/lib/agent/db/guests'
import { conversationParticipantIds } from '@/lib/agent/db/participants'
import { users } from '@/lib/identity/shared'

import { buildConversationOwnerMap } from './conversation-view'

import type { AgentConversation } from '@/lib/agent/db'

type Shared = Pick<
  AgentConversation,
  | 'sessionId'
  | 'userId'
  | 'participantIds'
  | 'viewOnlyIds'
  | 'managerIds'
  | 'generalAccess'
  | 'guestIds'
>

type GuestRow = {
  key: string
  email: string
  id?: string
  name?: string
  avatarURL?: string
  pending: boolean
}

/** Guests who joined, then invites to people who have not signed in yet. */
async function serializeGuests(conversation: Shared): Promise<GuestRow[]> {
  const ids = (conversation.guestIds ?? []).filter((id) => ObjectId.isValid(id))
  const docs = ids.length
    ? await users()
        .find(
          { _id: { $in: ids.map((id) => new ObjectId(id)) } },
          { projection: { email: 1, name: 1, avatarURL: 1 } },
        )
        .toArray()
    : []
  const pending = await pendingGuestEmails(conversation.sessionId)

  return [
    ...docs.map((doc) => ({
      key: doc._id.toHexString(),
      id: doc._id.toHexString(),
      email: doc.email,
      name: doc.name,
      avatarURL: doc.avatarURL,
      pending: false,
    })),
    ...pending.map((email) => ({ key: email, email, pending: true })),
  ]
}

/** Who is in a conversation and what each may do, as every sharing route answers. */
export async function serializeAccess(conversation: Shared, teamId: string | undefined) {
  const ids = conversationParticipantIds(conversation)
  const byId = await buildConversationOwnerMap(teamId, ids)

  return {
    generalAccess: generalAccessOf(conversation),
    participants: ids.map((id) => {
      const resolved = byId.get(id)
      const isOwner = id === conversation.userId

      return {
        ...(resolved ?? { id, name: 'Unknown user', email: '', avatarURL: '' }),
        isOwner,
        role: isOwner ? 'owner' : participantRole(conversation, id),
      }
    }),
    guests: await serializeGuests(conversation),
  }
}
