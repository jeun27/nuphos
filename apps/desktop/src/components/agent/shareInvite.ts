import { emailToInvite, looksLikeEmail } from './room/pendingInviteRows.ts'

import type { TeamMember } from '../../types'

/** What the Share workspace field's Invite does with what was typed. */
export type WorkspaceInviteTarget =
  | { kind: 'none' }
  | { kind: 'new'; email: string }
  | { kind: 'member'; member: TeamMember }
  | { kind: 'here'; member: TeamMember }

/**
 * A new email is invited to the team and this chat; a teammate's email adds
 * them to the chat; someone already here, a half-typed email, or a team still
 * loading leaves Invite disabled.
 */
export function workspaceInviteTarget(
  value: string,
  members: readonly TeamMember[] | null,
  participantIds: ReadonlySet<string>,
): WorkspaceInviteTarget {
  const email = value.trim().toLowerCase()

  if (!members || !looksLikeEmail(email)) return { kind: 'none' }
  const member = members.find((entry) => entry.email.toLowerCase() === email)

  if (!member) return { kind: 'new', email }

  return participantIds.has(member.id) ? { kind: 'here', member } : { kind: 'member', member }
}

/** The line under the teammate grid, if any. */
export type PickerNotice =
  | { kind: 'loading' }
  | { kind: 'invite'; email: string }
  | { kind: 'everyone-here' }
  | { kind: 'no-match' }
  | null

export function pickerNotice(
  query: string,
  members: readonly TeamMember[] | null,
  invitableCount: number,
  shownCount: number,
): PickerNotice {
  if (!members) return { kind: 'loading' }
  const email = emailToInvite(query, members)

  if (email && shownCount === 0) return { kind: 'invite', email }
  if (invitableCount === 0) return { kind: 'everyone-here' }

  return shownCount === 0 ? { kind: 'no-match' } : null
}

/** The team admin a non-admin is pointed at: the first one listed, never the viewer. */
export function firstAdminName(members: readonly TeamMember[] | null, viewerId: string) {
  const admin = members?.find((member) => member.role === 'ADMINISTRATOR' && member.id !== viewerId)

  return admin ? admin.name || admin.username || admin.email : null
}
