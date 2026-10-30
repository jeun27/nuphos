import { t } from '../../../i18n/index.ts'

import type {
  AgentConversation,
  AgentConversationParticipant,
  AgentMessageMetadata,
  GroupAgent,
} from '../../../api/agent-types.ts'
import type { AgentProvider } from '../../../types/runtime.ts'

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

/** One agent in a group: its session, plus what the sidebar's list knows of it. */
export type RoomAgent = GroupAgent & {
  provider?: AgentProvider
  /** The viewer can open its session: it is in their conversation list. */
  readable: boolean
  /** The viewer owns or manages its session. */
  managed: boolean
}

export type RoomTab = 'all' | 'people' | 'agents'

export function roomAgents(
  agents: readonly GroupAgent[],
  listed: readonly AgentConversation[],
): RoomAgent[] {
  const byId = new Map(listed.map((conversation) => [conversation.sessionId, conversation]))

  return agents.map((agent) => {
    const session = byId.get(agent.sessionId)

    return {
      ...agent,
      title: agent.title || t('Untitled agent'),
      ...(session?.agentRuntime ? { provider: session.agentRuntime } : {}),
      readable: Boolean(session),
      managed: Boolean(session && (session.isOwner || session.canManage)),
    }
  })
}

/** "2 people, 3 agents". */
export function roomHeadline(people: number, agents: number): string {
  return t('{people}, {agents}', {
    people: people === 1 ? t('1 person') : t('{n} people', { n: people }),
    agents: agents === 1 ? t('1 agent') : t('{n} agents', { n: agents }),
  })
}

/**
 * The sessions the viewer may bring into a group: their own or ones they
 * manage, never a group, and not already in this one.
 */
export function addableAgents(
  listed: readonly AgentConversation[],
  inGroup: readonly string[],
): AgentConversation[] {
  const present = new Set(inGroup)

  return listed.filter(
    (conversation) =>
      !isGroup(conversation) &&
      !conversation.archivedAt &&
      (conversation.isOwner === true || conversation.canManage === true) &&
      !present.has(conversation.sessionId),
  )
}

/** The group's owner may remove any agent; an agent's owner or manager may take theirs out. */
export function canRemoveAgent(
  agent: RoomAgent,
  viewerId: string,
  viewerOwnsGroup: boolean,
): boolean {
  return viewerOwnsGroup || agent.ownerId === viewerId || agent.managed
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

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@')
  const dot = value.lastIndexOf('.')

  return at > 0 && at === value.lastIndexOf('@') && dot > at + 1 && dot < value.length - 1
}

/** An email that is no teammate's: they join the workspace before the group. */
export function outsideEmail(query: string, members: readonly { email: string }[]): boolean {
  const email = query.trim().toLowerCase()

  return (
    !email.includes(' ') &&
    looksLikeEmail(email) &&
    !members.some((member) => member.email.toLowerCase() === email)
  )
}

export function roleLabel(role: AgentConversationParticipant['role']): string {
  if (role === 'owner') return t('Owner')
  if (role === 'manage') return t('Can manage')
  if (role === 'view') return t('Can view')

  return t('Can reply')
}
