import { t } from '../../../i18n/index.ts'

import type { AgentGuestPerson, AgentGuestTreeEntry } from '../../../api/agent-types.ts'
import type { AgentProvider } from '../../../types/runtime.ts'

/** How often an open guest view asks for the chat again. */
export const GUEST_POLL_MS = 5_000

/** One chat of the shared tree, placed for the guest's agent row. */
export type GuestAgent = {
  sessionId: string
  title: string
  provider: AgentProvider
  /** 0 for the top of the tree, 1 for its sub-agents, and so on. */
  depth: number
  working: boolean
}

/**
 * The shared tree from the top, parents before children, siblings in the
 * order the backend sent them. An entry whose parent is not shared starts the
 * list as a top; `seen` stops a loop in bad data.
 */
export function guestAgents(tree: readonly AgentGuestTreeEntry[]): GuestAgent[] {
  const ids = new Set(tree.map((entry) => entry.sessionId))
  const agents: GuestAgent[] = []
  const seen = new Set<string>()
  const visit = (entry: AgentGuestTreeEntry, depth: number) => {
    if (seen.has(entry.sessionId)) return
    seen.add(entry.sessionId)
    agents.push({
      sessionId: entry.sessionId,
      title: entry.title || t('Untitled agent'),
      provider: entry.agentRuntime ?? 'claude-code',
      depth,
      working: Boolean(entry.activeRun),
    })
    for (const child of tree) {
      if (child.parentSessionId === entry.sessionId) visit(child, depth + 1)
    }
  }

  for (const entry of tree) {
    if (!entry.parentSessionId || !ids.has(entry.parentSessionId)) visit(entry, 0)
  }
  // Whatever is left sits in a loop with no way in from a top.
  for (const entry of tree) visit(entry, 0)

  return agents
}

/** The chat to show: the one picked from the tree while it is still shared, else the linked one. */
export function shownGuestChat(
  picked: string | null,
  tree: readonly AgentGuestTreeEntry[],
  linked: string,
): string {
  return picked && tree.some((entry) => entry.sessionId === picked) ? picked : linked
}

const RANK: Record<AgentGuestPerson['role'], number> = {
  owner: 0,
  manage: 1,
  reply: 1,
  view: 1,
  guest: 2,
}

/** Owner first, then teammates, then guests; names keep their order within each. */
export function guestPeople(people: readonly AgentGuestPerson[]): AgentGuestPerson[] {
  const rank = (person: AgentGuestPerson) => (person.isOwner ? 0 : RANK[person.role])

  return [...people].sort((a, b) => rank(a) - rank(b))
}

/** "Used 3 tools": all a guest sees of an agent's tool calls. */
export function toolSummary(parts: readonly { type: string }[]): string | null {
  const count = parts.filter((part) => part.type === 'tool').length

  if (count === 0) return null

  return count === 1 ? t('Used 1 tool') : t('Used {count} tools', { count })
}
