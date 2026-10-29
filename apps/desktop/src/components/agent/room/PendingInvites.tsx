import { ChevronDown, Link2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { Avatar } from '../../Avatar'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/menu'
import { toast } from '../../ui/toast'
import { agentSessionUrl } from '../sessionUrl'

import { TEAM_INVITATIONS_CHANGED_EVENT, pendingInvitesFor } from './pendingInvites'

import type { Room } from './useRoom'
import type { TeamInvitation } from '../../../types'

const ROW = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left'

function useTeamInvitations(teamId: string) {
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
 * team admin can send the invitation again or copy the chat's link; anyone else
 * sees the row as it is.
 */
export function PendingInvites({ room }: { room: Room }) {
  const invitations = useTeamInvitations(room.teamId)
  const sessionIds = [room.here, ...room.agents.map((agent) => agent.sessionId)]
  const pending = pendingInvitesFor(invitations, sessionIds)
  const teamName = room.team?.name ?? t('the team')

  const carried = (invitation: TeamInvitation) =>
    invitation.conversations?.find((entry) => sessionIds.includes(entry.sessionId)) ?? {
      sessionId: room.here,
      role: 'reply' as const,
    }
  const resend = (invitation: TeamInvitation) => {
    const email = invitation.inviteeEmail

    api
      .atlasInviteTeamMember(room.teamId, email, carried(invitation))
      .then(() => toast.success(t('Sent the invite to {email} again', { email })))
      .catch((err: unknown) => toast.apiError(t('Failed to invite {email}', { email }), err))
  }
  const copyLink = (invitation: TeamInvitation) => {
    navigator.clipboard
      .writeText(agentSessionUrl(room.teamId, carried(invitation).sessionId))
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
        </MenuContent>
      </Menu>
    ) : (
      <div key={invitation.id} className={ROW}>
        <PendingFace invitation={invitation} />
      </div>
    ),
  )
}
