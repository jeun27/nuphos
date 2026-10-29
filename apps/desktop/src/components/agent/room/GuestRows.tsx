import { ChevronDown, UserMinus, UserPlus } from 'lucide-react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { Avatar } from '../../Avatar'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/menu'
import { toast } from '../../ui/toast'
import { announceTimelineChange } from '../panel/timelineEvents'

import { GuestBadge } from './GuestBadge'
import { announceTeamInvitationsChanged } from './pendingInviteRows'
import { guestName } from './roomModel'
import { publishRoomAccess } from './useRoom'

import type { Room } from './useRoom'
import type { ConversationGuest } from '../../../api/agent-types'

const ROW = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left'

function GuestFace({ guest }: { guest: ConversationGuest }) {
  return (
    <>
      <Avatar
        src={guest.avatarURL}
        name={guestName(guest)}
        size={28}
        className={guest.pending ? '!rounded-full opacity-60' : '!rounded-full'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-main">{guestName(guest)}</span>
          <GuestBadge />
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-tertiary">
          {guest.pending ? t('Invited · not joined yet') : guest.email}
        </div>
      </div>
      <span className="shrink-0 text-[12px] text-tertiary">{t('View only')}</span>
    </>
  )
}

/**
 * The room's guests under its people. The owner opens a guest for the two
 * things worth doing: make them a member (team admins only), or remove them.
 */
export function GuestRows({ room, currentUserId }: { room: Room; currentUserId: string }) {
  const viewerIsOwner = room.people.some((person) => person.isOwner && person.id === currentUserId)
  const teamName = room.team?.name ?? t('the team')

  const inviteAsMember = (guest: ConversationGuest) => {
    const { email } = guest

    api
      .atlasInviteTeamMember(room.teamId, email, { sessionId: room.here, role: 'reply' })
      .then(() => {
        announceTeamInvitationsChanged(room.teamId)
        toast.success(t('Invited {email} to {team}', { email, team: teamName }))
      })
      .catch((err: unknown) => toast.apiError(t('Failed to invite {email}', { email }), err))
  }
  const remove = (guest: ConversationGuest) => {
    api
      .agentRemoveGuest(room.here, room.teamId, guest.key)
      .then((access) => {
        publishRoomAccess(room.here, access)
        announceTimelineChange(room.here)
      })
      .catch((err: unknown) =>
        toast.apiError(t('Failed to remove {name}', { name: guestName(guest) }), err),
      )
  }

  return room.guests.map((guest) =>
    viewerIsOwner ? (
      <Menu key={guest.key}>
        <MenuTrigger
          className={`${ROW} hover:bg-zGray-800/40 data-[popup-open]:bg-zGray-800/40`}
          title={t('Guest options')}
        >
          <GuestFace guest={guest} />
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-tertiary" strokeWidth={2} />
        </MenuTrigger>
        <MenuContent align="end" className="w-[260px]">
          {room.team?.isAdmin && (
            <MenuItem
              icon={<UserPlus className="h-3.5 w-3.5" strokeWidth={2} />}
              onClick={() => inviteAsMember(guest)}
            >
              {t('Invite to {team} as a member', { team: teamName })}
            </MenuItem>
          )}
          <MenuItem
            destructive
            icon={<UserMinus className="h-3.5 w-3.5" strokeWidth={2} />}
            onClick={() => remove(guest)}
          >
            {t('Remove guest')}
          </MenuItem>
        </MenuContent>
      </Menu>
    ) : (
      <div key={guest.key} className={ROW}>
        <GuestFace guest={guest} />
      </div>
    ),
  )
}
