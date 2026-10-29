import { generalAccessOf, participantRole } from './access'

import type { GeneralAccess, ParticipantRole } from './access'

type GrantFields = {
  generalAccess?: GeneralAccess
  participantIds?: string[]
  viewOnlyIds?: string[]
  managerIds?: string[]
}
type ParentFields = GrantFields & { userId: string }

/** Who may open a conversation, spelled out so a sub-agent can carry a copy. */
export type Grant = {
  generalAccess: GeneralAccess
  participantIds: string[]
  viewOnlyIds: string[]
  managerIds: string[]
}

const GENERAL_RANK: Record<GeneralAccess, number> = { none: 0, view: 1, reply: 2 }
const ROLES: readonly ParticipantRole[] = ['view', 'reply', 'manage']
const lower = <T>(order: readonly T[], a: T, b: T) => (order.indexOf(a) <= order.indexOf(b) ? a : b)

/**
 * A sub-agent an agent opens is shared exactly like the conversation that runs
 * it, so a teammate who can follow the manager can follow its workers too.
 */
export function inheritedGrant(parent: GrantFields): Grant {
  return {
    generalAccess: generalAccessOf(parent),
    participantIds: [...(parent.participantIds ?? [])],
    viewOnlyIds: [...(parent.viewOnlyIds ?? [])],
    managerIds: [...(parent.managerIds ?? [])],
  }
}

/** The most the parent lets one person do, or null when they cannot open it. */
function parentCeiling(parent: ParentFields, userId: string): ParticipantRole | null {
  if (parent.userId === userId) return 'manage'
  const own = participantRole(parent, userId)
  const general = generalAccessOf(parent)
  const fromTeam = general === 'none' ? null : general

  if (!own) return fromTeam
  if (!fromTeam) return own

  return ROLES.indexOf(own) >= ROLES.indexOf(fromTeam) ? own : fromTeam
}

/**
 * The child's own grant, cut down to what the parent allows: never wider team
 * access, nobody the parent shuts out, and no role above the parent's. Used for
 * a sub-agent shared on its own, and for any thread nested later.
 */
export function narrowToParent(child: GrantFields, parent: ParentFields): Grant {
  const grant: Grant = {
    generalAccess: lower(
      ['none', 'view', 'reply'] as const,
      generalAccessOf(child),
      generalAccessOf(parent),
    ),
    participantIds: [],
    viewOnlyIds: [],
    managerIds: [],
  }

  for (const id of child.participantIds ?? []) {
    const own = participantRole(child, id)
    const ceiling = parentCeiling(parent, id)

    if (!own || !ceiling) continue
    const role = lower(ROLES, own, ceiling)

    grant.participantIds.push(id)
    if (role === 'view') grant.viewOnlyIds.push(id)
    if (role === 'manage') grant.managerIds.push(id)
  }

  return grant
}

/** Whether a sub-agent's team-wide grant would reach further than its parent's. */
export function widerThanParent(requested: GeneralAccess, parent: GrantFields): boolean {
  return GENERAL_RANK[requested] > GENERAL_RANK[generalAccessOf(parent)]
}

/** Whether inviting `userId` to a sub-agent with `role` gives more than the parent does. */
export function inviteExceedsParent(
  parent: ParentFields,
  userId: string,
  role: ParticipantRole,
): boolean {
  const ceiling = parentCeiling(parent, userId)

  return !ceiling || ROLES.indexOf(role) > ROLES.indexOf(ceiling)
}
