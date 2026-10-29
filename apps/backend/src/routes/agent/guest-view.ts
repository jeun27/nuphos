import { getConversationBySessionId, getConversationWithMessages } from '@/lib/agent/db'
import { claimGuestInvitation } from '@/lib/agent/db/guests'
import { agentConversations } from '@/lib/agent/db/shared'

import { serializeAccess } from './conversation-access-view'
import { serializeMessageDoc } from './errors'

import type { AgentConversation } from '@/lib/agent/db'

// The same caps the sharing tree uses: a guest never reads further than them.
const MAX_DEPTH = 16
const MAX_NODES = 500
const TAIL = 200

const isGuestOf = (conversation: AgentConversation | null, userId: string) =>
  Boolean(conversation && !conversation.archivedAt && conversation.guestIds?.includes(userId))

/** The highest chat above this one the guest may still read: where their room starts. */
async function roomTop(conversation: AgentConversation, userId: string) {
  let top = conversation

  for (let depth = 0; top.parentSessionId && depth < MAX_DEPTH; depth += 1) {
    const parent = await agentConversations().findOne({
      sessionId: top.parentSessionId,
      userId: conversation.userId,
    })

    if (!parent || !isGuestOf(parent, userId)) break
    top = parent
  }

  return top
}

/** Every chat in that room the guest may read, parents before children. */
async function roomTree(top: AgentConversation, userId: string) {
  const scope = { userId: top.userId, ...(top.teamId ? { teamId: top.teamId } : {}) }
  const tree = [top]
  let frontier = [top.sessionId]

  for (let depth = 0; frontier.length > 0 && depth < MAX_DEPTH; depth += 1) {
    const level = await agentConversations()
      .find({ ...scope, parentSessionId: { $in: frontier }, guestIds: userId })
      .toArray()
    const open = level.filter((node) => !node.archivedAt).slice(0, MAX_NODES - tree.length)

    tree.push(...open)
    frontier = open.map((node) => node.sessionId)
  }

  return tree
}

/**
 * What a guest sees of one chat: its messages, the room it sits in, and who
 * is there. Null when they are not a guest of it, exactly as for no chat.
 */
export async function guestConversationView(sessionId: string, userId: string, email: string) {
  if (email) await claimGuestInvitation(sessionId, userId, email)
  const conversation = await getConversationBySessionId(sessionId)

  if (!conversation || !isGuestOf(conversation, userId)) return null
  const transcript = await getConversationWithMessages(
    sessionId,
    conversation.userId,
    conversation.teamId,
    { tail: TAIL },
  )
  const tree = await roomTree(await roomTop(conversation, userId), userId)
  const access = await serializeAccess(conversation, conversation.teamId)
  const owner = access.participants.find((person) => person.isOwner)

  return {
    conversation: {
      sessionId,
      title: conversation.title,
      teamId: conversation.teamId,
      agentRuntime: conversation.agentRuntime,
      runtimeLabel: conversation.runtimeLabel,
      parentSessionId: conversation.parentSessionId,
      owner: { id: conversation.userId, name: owner?.name ?? '', avatarURL: owner?.avatarURL },
    },
    messages: (transcript?.messages ?? []).map(serializeMessageDoc),
    tree: tree.map((node) => ({
      sessionId: node.sessionId,
      title: node.title,
      agentRuntime: node.agentRuntime,
      parentSessionId: node.parentSessionId,
      linkedResources: node.linkedResources,
    })),
    // Names and faces only: a guest never learns teammates' or other guests' emails.
    people: [
      ...access.participants.map((person) => ({
        id: person.id,
        name: person.name,
        avatarURL: person.avatarURL,
        isOwner: person.isOwner,
        role: person.role,
      })),
      ...access.guests
        .filter((guest) => !guest.pending)
        .map((guest) => ({
          id: guest.id,
          name: guest.name,
          avatarURL: guest.avatarURL,
          isOwner: false,
          role: 'guest',
        })),
    ],
  }
}
