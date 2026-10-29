import type { InvitationConversation, TeamInvitation, TeamMember } from '../../../types'

/** Fired with the team id when an invitation is sent from a chat, so the room's list reloads. */
export const TEAM_INVITATIONS_CHANGED_EVENT = 'nuphos:team-invitations-changed'

export function announceTeamInvitationsChanged(teamId: string) {
  window.dispatchEvent(new CustomEvent(TEAM_INVITATIONS_CHANGED_EVENT, { detail: teamId }))
}

/** A plain `name@host.tld` check: one @, no spaces, a dot inside the domain. */
export function looksLikeEmail(value: string) {
  const parts = value.split('@')
  const [local, domain] = parts

  if (parts.length !== 2 || !local || !domain || /\s/.test(value)) return false

  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
}

/** The email typed into the teammate search when it names nobody in the team yet. */
export function emailToInvite(query: string, members: readonly TeamMember[] | null) {
  const email = query.trim().toLowerCase()

  if (!members || !looksLikeEmail(email)) return null

  return members.some((member) => member.email.toLowerCase() === email) ? null : email
}

/** People invited into one of these chats by email who have not joined the team yet. */
export function pendingInvitesFor(
  invitations: readonly TeamInvitation[],
  sessionIds: readonly string[],
): TeamInvitation[] {
  const here = new Set(sessionIds)

  return invitations.filter(
    (invitation) =>
      !invitation.acceptedAt &&
      !invitation.rejectedAt &&
      invitation.conversations?.some((entry) => here.has(entry.sessionId)),
  )
}

/** The chat in this room an invitation carries, with its role; the room's own chat when it names none. */
export function carriedConversation(
  invitation: TeamInvitation,
  sessionIds: readonly string[],
): InvitationConversation {
  return (
    invitation.conversations?.find((entry) => sessionIds.includes(entry.sessionId)) ?? {
      sessionId: sessionIds[0],
      role: 'reply',
    }
  )
}
