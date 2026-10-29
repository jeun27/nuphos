import type { AgentConversation, AgentMessageMetadata } from '../../../api/agent-types.ts'

/**
 * Agent-woken turns a group allows between two posts by a person. Mirrors
 * GROUP_AGENT_TURN_BUDGET in apps/backend/src/lib/agent/group-chat.ts, which
 * the API does not expose.
 */
export const GROUP_AGENT_TURN_BUDGET = 10

export function isGroup(conversation: { kind?: string } | null | undefined): boolean {
  return conversation?.kind === 'group'
}

/** What a tab keeps of a group; nothing for an ordinary conversation. */
export function groupFields(conversation: AgentConversation): {
  kind?: 'group'
  agentSessionIds?: string[]
  agentTurns?: number
} {
  if (!isGroup(conversation)) return {}

  return {
    kind: 'group',
    agentSessionIds: conversation.agentSessionIds ?? [],
    agentTurns: conversation.agentTurns ?? 0,
  }
}

/**
 * The next agent post would wake no one: it spends one turn per other agent
 * (at least one), and the budget only refills when a person posts.
 */
export function agentsPaused(agentTurns: number | undefined, agentCount: number): boolean {
  if (agentCount === 0) return false

  return (agentTurns ?? 0) + Math.max(agentCount - 1, 1) > GROUP_AGENT_TURN_BUDGET
}

/** A message an agent posted to the group with group_post. */
export function isAgentPost(metadata: AgentMessageMetadata | undefined): boolean {
  return metadata?.source === 'agent.thread' && metadata.sender.type === 'agent'
}

/** Its name links to the session only when the viewer could open it. */
export function agentPostLink(
  metadata: AgentMessageMetadata,
  readable: (sessionId: string) => boolean,
): string | null {
  const sessionId = metadata.sourceSessionId

  return sessionId && readable(sessionId) ? sessionId : null
}
