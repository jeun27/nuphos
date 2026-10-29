import { t } from '../../../i18n/index.ts'
import { AGENT_PROVIDER } from '../../../types/runtime.ts'

import type {
  AgentConversation,
  AgentConversationParticipant,
  AgentMessageMetadata,
  QueuedOnServer,
} from '../../../api/agent-types.ts'
import type { AgentProvider } from '../../../types/runtime.ts'

/** One agent in the room: the chat's own, or a sub-agent anywhere below it. */
export type RoomAgent = {
  sessionId: string
  title: string
  avatar?: string
  provider: AgentProvider
  /** The runtime it runs on, e.g. "Bryan's MacBook Pro". */
  runtimeLabel?: string
  /** Whose runtime and subscription it runs on. */
  ownerId?: string
  /** 0 for the chat itself, 1 for its sub-agents, and so on. */
  depth: number
  working: boolean
}

export type RoomTab = 'all' | 'people' | 'agents'

/**
 * The chat and every sub-agent below it, parents before children. A thread
 * the viewer cannot list is simply absent; `seen` stops a loop in bad data.
 */
export function roomAgents(
  root: AgentConversation | undefined,
  conversations: readonly AgentConversation[],
  isWorking: (conversation: AgentConversation) => boolean,
): RoomAgent[] {
  if (!root) return []
  const agents: RoomAgent[] = []
  const seen = new Set<string>()
  const visit = (conversation: AgentConversation, depth: number) => {
    if (seen.has(conversation.sessionId)) return
    seen.add(conversation.sessionId)
    agents.push(toRoomAgent(conversation, depth, isWorking(conversation)))
    for (const child of conversations) {
      if (child.parentSessionId === conversation.sessionId) visit(child, depth + 1)
    }
  }

  visit(root, 0)

  return agents
}

function toRoomAgent(conversation: AgentConversation, depth: number, working: boolean): RoomAgent {
  return {
    sessionId: conversation.sessionId,
    title: conversation.title || conversation.firstMessage || t('Untitled agent'),
    avatar: conversation.avatar,
    provider: conversation.agentRuntime ?? 'claude-code',
    runtimeLabel: conversation.runtimeLabel,
    ownerId: conversation.owner?.id,
    depth,
    working,
  }
}

/** Each provider once, in the order the room first uses it. */
export function roomProviders(agents: readonly RoomAgent[]): AgentProvider[] {
  return [...new Set(agents.map((agent) => agent.provider))]
}

/** "2 people, 5 agents on", ahead of the provider chips. */
export function roomHeadline(people: number, agents: number): string {
  return t('{people}, {agents} on', {
    people: people === 1 ? t('1 person') : t('{count} people', { count: people }),
    agents: agents === 1 ? t('1 agent') : t('{count} agents', { count: agents }),
  })
}

/** The bar earns its row once there is someone or something to share the room with. */
export function roomIsShared(people: number, agents: number): boolean {
  return people > 1 || agents > 1
}

/**
 * The agents a person brings: the runtimes their own chats run on. Sub-agents
 * always run as the chat's owner, so an agent without an owner is the owner's.
 */
export function agentsBroughtBy(
  person: AgentConversationParticipant,
  agents: readonly RoomAgent[],
): AgentProvider[] {
  const own = agents.filter((agent) =>
    agent.ownerId ? agent.ownerId === person.id : person.isOwner,
  )

  return roomProviders(own)
}

/** "Bryan's Claude Code": whose subscription an agent spends. */
export function possessiveRuntime(name: string, provider: AgentProvider): string {
  const first = name.trim().split(/\s+/)[0] || name

  return t('{name}’s {agent}', { name: first, agent: AGENT_PROVIDER[provider].label })
}

export function roleLabel(role: AgentConversationParticipant['role']): string {
  if (role === 'owner') return t('Owner')
  if (role === 'manage') return t('Can manage')
  if (role === 'reply') return t('Can reply')

  return role === 'view' ? t('Can view') : t('Team access')
}

type Sent = { role: string; metadata?: AgentMessageMetadata }

const askedBy = (message: Sent | undefined) =>
  message?.role === 'user' && message.metadata?.sender.type === 'user'
    ? message.metadata.sender
    : undefined

/**
 * Who asked for the turn running now: the newest person-sent message. Only
 * worth naming once more than one person has asked here.
 */
export function runningRequester(
  messages: readonly Sent[],
): AgentMessageMetadata['sender'] | undefined {
  const askers = new Set(messages.flatMap((message) => askedBy(message)?.id ?? []))

  if (askers.size < 2) return undefined
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const sender = askedBy(messages[i])

    if (sender) return sender
  }

  return undefined
}

export type QueuedFromOthers = { id: string; text: string; senderName: string }

/**
 * Teammates' messages waiting behind the running turn, in the order they run,
 * each with who sent it. The viewer's own stay in their editable strip.
 */
export function queuedFromOthers(
  queue: readonly QueuedOnServer[],
  people: readonly AgentConversationParticipant[],
): QueuedFromOthers[] {
  const names = new Map(people.map((person) => [person.id, person.name]))

  return queue
    .filter((item) => !item.mine)
    .map((item) => ({
      id: item.id,
      text: item.text,
      senderName: names.get(item.senderUserId ?? '') ?? t('A teammate'),
    }))
}
