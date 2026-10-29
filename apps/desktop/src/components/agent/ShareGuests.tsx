import { Loader2, X } from 'lucide-react'

import { t } from '../../i18n'
import { Avatar } from '../Avatar'
import { Button } from '../ui/button'

import { GuestBadge } from './room/GuestBadge'
import { guestName } from './room/roomModel'

import type { ConversationGuest } from '../../api/agent-types'

/** People from outside the team who may view this chat, each one click from gone. */
export function ShareGuests({
  guests,
  canManage,
  removing,
  onRemove,
}: {
  guests: ConversationGuest[]
  canManage: boolean
  removing: string | null
  onRemove: (guest: ConversationGuest) => void
}) {
  if (guests.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <div className="px-1 text-[11px] font-medium text-tertiary">{t('Guests')}</div>
      {guests.map((guest) => (
        <div
          key={guest.key}
          className="flex h-7 items-center gap-2 rounded-md px-1 text-[13px] hover:bg-zGray-800/40"
        >
          <Avatar
            src={guest.avatarURL}
            name={guestName(guest)}
            size={18}
            className={guest.pending ? '!rounded-full opacity-60' : '!rounded-full'}
          />
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="min-w-0 truncate text-main" title={guest.email}>
              {guestName(guest)}
            </span>
            <GuestBadge />
          </span>
          {guest.pending && <span className="text-[12px] text-tertiary">{t('Pending')}</span>}
          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-tertiary"
              title={t('Remove guest')}
              aria-label={t('Remove guest')}
              disabled={removing !== null}
              onClick={() => onRemove(guest)}
            >
              {removing === guest.key ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
