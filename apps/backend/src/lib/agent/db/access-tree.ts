import { conversationAccess, generalAccessOf } from './access'

import type { GeneralAccess, ParticipantRole } from './access'

type GrantFields = {
  generalAccess?: GeneralAccess
  participantIds?: string[]
  viewOnlyIds?: string[]
  managerIds?: string[]
}

/** Who may open a conversation, spelled out so a sub-agent can carry a copy. */
export type Grant = {
  generalAccess: GeneralAccess
  participantIds: string[]
  viewOnlyIds: string[]
  managerIds: string[]
}

const GENERAL_RANK: Record<GeneralAccess, number> = { none: 0, view: 1, reply: 2 }
const ROLE_RANK: Record<ParticipantRole, number> = { view: 0, reply: 1, manage: 2 }

/**
 * A sub-agent is shared exactly like the conversation that runs it, so a
 * teammate who can follow the manager can follow its workers too.
 */
export function inheritedGrant(parent: GrantFields): Grant {
  return {
    generalAccess: generalAccessOf(parent),
    participantIds: [...(parent.participantIds ?? [])],
    viewOnlyIds: [...(parent.viewOnlyIds ?? [])],
    managerIds: [...(parent.managerIds ?? [])],
  }
}

/** Whether a sub-agent's team-wide grant would reach further than its parent's. */
export function widerThanParent(requested: GeneralAccess, parent: GrantFields): boolean {
  return GENERAL_RANK[requested] > GENERAL_RANK[generalAccessOf(parent)]
}

/**
 * Whether inviting `userId` to a sub-agent with `role` would give them more
 * than the parent already does. The parent's owner counts as a manager there.
 */
export function inviteExceedsParent(
  parent: GrantFields & { userId: string; teamId?: string },
  userId: string,
  role: ParticipantRole,
): boolean {
  const access = conversationAccess(parent, userId)

  if (!access) return true
  const ceiling: ParticipantRole = access === 'owner' ? 'manage' : access

  return ROLE_RANK[role] > ROLE_RANK[ceiling]
}
