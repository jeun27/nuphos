import { ChevronDown, Link2, Mail } from 'lucide-react'

import { t } from '../../../i18n'
import { Avatar } from '../../Avatar'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../../ui/menu'
import { toast } from '../../ui/toast'
import { agentSessionUrl } from '../sessionUrl'

import { carriedConversation, pendingInvitesFor } from './pendingInviteRows'
import { cancelInvitation, resendInvitation, useTeamInvitations } from './useTeamInvitations'

import type { Room } from './useRoom'
import type { TeamInvitation } from '../../../types'

const ROW = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left'

function PendingFace({ invitation }: { invitation: TeamInvitation }) {
  return (
    <>
      <Avatar name={invitation.inviteeEmail} size={28} className="!rounded-full opacity-60" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-secondary">
          {invitation.inviteeEmail}
        </div>
        <div className="mt-0.5 text-[11.5px] text-tertiary">{t('Invited · not joined yet')}</div>
      </div>
    </>
  )
}

/**
 * People invited into this room by email who have not joined the team yet. A
 * team admin can send it again, copy the chat's link, or cancel it; anyone else
 * sees the row as it is.
 */
export function PendingInvites({ room }: { room: Room }) {
  const invitations = useTeamInvitations(room.teamId)
  const sessionIds = [room.here, ...room.agents.map((agent) => agent.sessionId)]
  const pending = pendingInvitesFor(invitations, sessionIds)
  const teamName = room.team?.name ?? t('the team')

  const resend = (invitation: TeamInvitation) =>
    void resendInvitation(room.teamId, invitation, sessionIds)
  const copyLink = (invitation: TeamInvitation) => {
    navigator.clipboard
      .writeText(
        agentSessionUrl(room.teamId, carriedConversation(invitation, sessionIds).sessionId),
      )
      .then(() => toast.success(t('Link copied')))
      .catch(() => toast.error(t('Could not copy the link')))
  }

  return pending.map((invitation) =>
    room.team?.isAdmin ? (
      <Menu key={invitation.id}>
        <MenuTrigger
          className={`${ROW} hover:bg-zGray-800/40 data-[popup-open]:bg-zGray-800/40`}
          title={t('Invite options')}
        >
          <PendingFace invitation={invitation} />
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-tertiary" strokeWidth={2} />
        </MenuTrigger>
        <MenuContent align="end" className="w-[240px]">
          <MenuItem
            icon={<Mail className="h-3.5 w-3.5" strokeWidth={2} />}
            onClick={() => resend(invitation)}
          >
            {t('Resend invite to {team}', { team: teamName })}
          </MenuItem>
          <MenuItem
            icon={<Link2 className="h-3.5 w-3.5" strokeWidth={2} />}
            onClick={() => copyLink(invitation)}
          >
            {t('Copy link to this chat')}
          </MenuItem>
          <MenuSeparator />
          <MenuItem destructive onClick={() => void cancelInvitation(room.teamId, invitation)}>
            {t('Cancel invite')}
          </MenuItem>
        </MenuContent>
      </Menu>
    ) : (
      <div key={invitation.id} className={ROW}>
        <PendingFace invitation={invitation} />
      </div>
    ),
  )
}
