import { inheritedGrant, narrowToParent } from './access-tree'
import { agentConversations } from './shared'

import type { AgentConversation } from './shared'

type Node = Pick<
  AgentConversation,
  | 'sessionId'
  | 'userId'
  | 'teamId'
  | 'generalAccess'
  | 'participantIds'
  | 'viewOnlyIds'
  | 'managerIds'
  | 'ownAccess'
>

// Deep enough for any real manager tree; a cap so bad data cannot spin forever.
const MAX_DEPTH = 16

/**
 * Carry a sharing change down the tree below `root`, one level at a time. A
 * sub-agent an agent opened follows its parent exactly; one shared on its own
 * or nested later keeps its grant, cut down to what its parent now allows.
 */
export async function syncDescendantAccess(root: Node): Promise<void> {
  const scope = { userId: root.userId, ...(root.teamId ? { teamId: root.teamId } : {}) }
  const seen = new Set([root.sessionId])
  let level: Node[] = [root]

  for (let depth = 0; depth < MAX_DEPTH && level.length > 0; depth += 1) {
    const parents = new Map(level.map((node) => [node.sessionId, node]))
    const children = await agentConversations()
      .find({ ...scope, parentSessionId: { $in: [...parents.keys()] } })
      .toArray()
    const next: Node[] = []

    for (const child of children) {
      const parent = child.parentSessionId ? parents.get(child.parentSessionId) : undefined

      if (!parent || seen.has(child.sessionId)) continue
      seen.add(child.sessionId)
      const grant = child.ownAccess ? narrowToParent(child, parent) : inheritedGrant(parent)

      await agentConversations().updateOne(
        { ...scope, sessionId: child.sessionId },
        { $set: grant },
      )
      next.push({ ...child, ...grant })
    }
    level = next
  }
}

/** A sub-agent whose sharing someone set by hand stops following its parent's widening. */
export async function markOwnAccess(sessionId: string): Promise<void> {
  await agentConversations().updateOne({ sessionId }, { $set: { ownAccess: true } })
}
