import { useState } from 'react'

import { t } from '../../i18n'
import { Avatar } from '../Avatar'
import { Button } from '../ui/button'

import { pendingInvitesFor } from './room/pendingInviteRows'
import { useRoom } from './room/useRoom'
import { cancelInvitation, resendInvitation, useTeamInvitations } from './room/useTeamInvitations'

import type { TeamInvitation } from '../../types'

const ACTION = 'h-6 px-1.5 !text-[12px] font-normal'

/**
 * Who was invited into this chat or its sub-agents by email and has not
 * joined yet, under the people in the Share card. A team admin can resend or cancel.
 */
export function SharePendingRows({
  sessionId,
  teamId,
  isAdmin,
}: {
  sessionId: string
  teamId: string
  isAdmin: boolean
}) {
  const room = useRoom(sessionId, teamId)
  const invitations = useTeamInvitations(teamId)
  const [busy, setBusy] = useState<string | null>(null)
  const sessionIds = [sessionId, ...room.agents.map((agent) => agent.sessionId)]

  const act = (invitation: TeamInvitation, run: () => Promise<unknown>) => {
    setBusy(invitation.id)
    void run().finally(() => setBusy(null))
  }

  return pendingInvitesFor(invitations, sessionIds).map((invitation) => (
    <div
      key={invitation.id}
      className="flex items-center gap-2 rounded-md px-1 py-0.5 text-[13px] hover:bg-zGray-800/40"
    >
      <Avatar name={invitation.inviteeEmail} size={18} className="!rounded-full opacity-60" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-secondary" title={invitation.inviteeEmail}>
          {invitation.inviteeEmail}
        </span>
        <span className="block text-[11px] text-tertiary">{t('Invited · pending')}</span>
      </span>
      {isAdmin && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={ACTION}
            disabled={busy === invitation.id}
            onClick={() => act(invitation, () => resendInvitation(teamId, invitation, sessionIds))}
          >
            {t('Resend')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={ACTION}
            disabled={busy === invitation.id}
            onClick={() => act(invitation, () => cancelInvitation(teamId, invitation))}
          >
            {t('Cancel')}
          </Button>
        </>
      )}
    </div>
  ))
}
