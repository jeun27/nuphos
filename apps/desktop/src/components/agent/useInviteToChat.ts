import { useState } from 'react'

import { api } from '../../api'
import { t } from '../../i18n'
import { toast } from '../ui/toast'

import { announceTeamInvitationsChanged } from './room/pendingInviteRows'

import type { ParticipantRole } from '../../api/agent-types'

export type EmailInviteContext = {
  teamId: string
  teamName: string
  sessionId: string
  role: ParticipantRole
}

/**
 * Invites an email to the team with this chat and role carried on the
 * invitation, so accepting lands them here. Resolves whether it was sent.
 */
export function useInviteToChat({ teamId, teamName, sessionId, role }: EmailInviteContext) {
  const [sending, setSending] = useState(false)

  const invite = (email: string) => {
    setSending(true)

    return api
      .atlasInviteTeamMember(teamId, email, { sessionId, role })
      .then(() => {
        announceTeamInvitationsChanged(teamId)
        toast.success(t('Invited {email} to {team}', { email, team: teamName }))

        return true
      })
      .catch((err: unknown) => {
        toast.apiError(t('Failed to invite {email}', { email }), err)

        return false
      })
      .finally(() => setSending(false))
  }

  return { invite, sending }
}
