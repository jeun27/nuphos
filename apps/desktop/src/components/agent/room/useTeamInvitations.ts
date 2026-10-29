import { useEffect, useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { toast } from '../../ui/toast'

import {
  TEAM_INVITATIONS_CHANGED_EVENT,
  announceTeamInvitationsChanged,
  carriedConversation,
} from './pendingInviteRows'

import type { TeamInvitation } from '../../../types'

/** The team's invitations, reloaded whenever one is sent or cancelled from a chat. */
export function useTeamInvitations(teamId: string) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .atlasListTeamInvitations(teamId)
        .then((next) => {
          if (!cancelled) setInvitations(next)
        })
        .catch((err: unknown) => toast.apiError(t('Failed to load invitations'), err))
    const reloadIfThisTeam = (event: Event) => {
      if ((event as CustomEvent<string>).detail === teamId) void load()
    }

    void load()
    window.addEventListener(TEAM_INVITATIONS_CHANGED_EVENT, reloadIfThisTeam)

    return () => {
      cancelled = true
      window.removeEventListener(TEAM_INVITATIONS_CHANGED_EVENT, reloadIfThisTeam)
    }
  }, [teamId])

  return invitations
}

/** Sends the same invitation again; the backend merges it and emails it anew. */
export function resendInvitation(
  teamId: string,
  invitation: TeamInvitation,
  sessionIds: readonly string[],
) {
  const email = invitation.inviteeEmail

  return api
    .atlasInviteTeamMember(teamId, email, carriedConversation(invitation, sessionIds))
    .then(() => toast.success(t('Sent the invite to {email} again', { email })))
    .catch((err: unknown) => toast.apiError(t('Failed to invite {email}', { email }), err))
}

/** Withdraws an invitation; the row leaves every list once they reload. */
export function cancelInvitation(teamId: string, invitation: TeamInvitation) {
  return api
    .atlasCancelTeamInvitation(teamId, invitation.id)
    .then(() => announceTeamInvitationsChanged(teamId))
    .catch((err: unknown) => toast.apiError(t('Cancel invite failed'), err))
}
