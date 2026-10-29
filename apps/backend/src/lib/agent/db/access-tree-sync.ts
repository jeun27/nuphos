import { AppError } from '@/lib/errors'

import { inheritedGrant, narrowToParent } from './access-tree'
import { agentConversations } from './shared'

import type { Grant } from './access-tree'
import type { AgentConversation } from './shared'

type Scope = { userId: string; teamId?: string }
type Node = Pick<
  AgentConversation,
  | 'sessionId'
  | 'parentSessionId'
  | 'userId'
  | 'generalAccess'
  | 'participantIds'
  | 'viewOnlyIds'
  | 'managerIds'
  | 'ownAccess'
>

// Deep and wide enough for any real manager tree. Past it a share change is
// refused before anything is written, rather than reaching part of the tree.
export const SHARE_TREE_LIMITS = { depth: 16, nodes: 500 }

const treeTooLarge = () =>
  new AppError(
    409,
    'share_tree_too_large',
    'This chat has too many nested sub-agents to share in one step. Archive some, then try again.',
  )

/** Every sub-agent below `rootId`, level by level, read before anything changes. */
async function readTree(rootId: string, scope: Scope, limits = SHARE_TREE_LIMITS) {
  const levels: Node[][] = []
  const seen = new Set([rootId])
  let frontier = [rootId]

  while (frontier.length > 0) {
    const level = (
      await agentConversations()
        .find({ ...scope, parentSessionId: { $in: frontier } })
        .toArray()
    ).filter((node) => !seen.has(node.sessionId))

    if (level.length > 0 && levels.length >= limits.depth) throw treeTooLarge()
    for (const node of level) seen.add(node.sessionId)
    if (seen.size - 1 > limits.nodes) throw treeTooLarge()
    if (level.length > 0) levels.push(level)
    frontier = level.map((node) => node.sessionId)
  }

  return levels
}

/**
 * Carry a conversation's sharing down the tree below it. A sub-agent an agent
 * opened follows its parent exactly; one shared on its own, or nested later,
 * keeps its grant cut down to what its parent allows. `narrowOnly` cuts every
 * sub-agent down to `grant` without widening any, which a change runs before
 * it writes the parent so that a failure part-way leaves less access, not more.
 * Without `grant`, the parent is read fresh, so a late sync never applies a
 * stale snapshot.
 */
export async function syncDescendantAccess(
  rootId: string,
  scope: Scope,
  options: { grant?: Grant; narrowOnly?: boolean; limits?: typeof SHARE_TREE_LIMITS } = {},
): Promise<void> {
  const fresh = options.grant
    ? undefined
    : await agentConversations().findOne({ ...scope, sessionId: rootId })
  const rootGrant = options.grant ?? (fresh ? inheritedGrant(fresh) : undefined)

  if (!rootGrant) return
  const levels = await readTree(rootId, scope, options.limits)
  const grants = new Map<string, Grant & { userId: string }>([
    [rootId, { ...rootGrant, userId: scope.userId }],
  ])

  for (const level of levels) {
    for (const child of level) {
      const parent = child.parentSessionId ? grants.get(child.parentSessionId) : undefined

      if (!parent) continue
      const grant =
        options.narrowOnly || child.ownAccess
          ? narrowToParent(child, parent)
          : inheritedGrant(parent)

      grants.set(child.sessionId, { ...grant, userId: scope.userId })
      await agentConversations().updateOne(
        { ...scope, sessionId: child.sessionId },
        { $set: grant },
      )
    }
  }
}

/** A sub-agent whose sharing someone set by hand stops following its parent's widening. */
export async function markOwnAccess(sessionId: string): Promise<void> {
  await agentConversations().updateOne({ sessionId }, { $set: { ownAccess: true } })
}
