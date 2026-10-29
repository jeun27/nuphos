import { agentConversations } from './shared'

import type { AgentConversation } from './shared'

type SteerNode = Pick<AgentConversation, 'sessionId' | 'userId' | 'parentSessionId' | 'teamSteer'>

// Matches the sharing tree's depth limit; a deeper chain is read as not granted.
const MAX_DEPTH = 16

/**
 * Whether the owner let the team steer this conversation on their computer:
 * set on it, or on any chat above it, so one switch covers a whole room.
 */
export async function roomTeamSteer(conversation: SteerNode): Promise<boolean> {
  let node: SteerNode | null = conversation

  for (let depth = 0; node && depth <= MAX_DEPTH; depth += 1) {
    if (node.teamSteer) return true
    node = node.parentSessionId
      ? await agentConversations().findOne(
          { sessionId: node.parentSessionId, userId: conversation.userId },
          { projection: { sessionId: 1, userId: 1, parentSessionId: 1, teamSteer: 1 } },
        )
      : null
  }

  return false
}

/** The owner's switch for a room; returns false when the conversation is not theirs. */
export async function setTeamSteer(
  sessionId: string,
  ownerId: string,
  enabled: boolean,
): Promise<boolean> {
  const result = await agentConversations().updateOne(
    { sessionId, userId: ownerId },
    enabled ? { $set: { teamSteer: true } } : { $unset: { teamSteer: '' } },
  )

  return result.matchedCount > 0
}
