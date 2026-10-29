import { Loader2, UserPlus } from 'lucide-react'

import { t } from '../../i18n'
import { Button } from '../ui/button'

import { useInviteToChat } from './useInviteToChat'

import type { EmailInviteContext } from './useInviteToChat'

/**
 * Someone who is not in the team yet: a team admin invites them by email, and
 * the invitation carries this chat, so accepting opens it for them.
 */
export function InviteByEmail({
  email,
  context,
  onInvited,
}: {
  email: string
  context: EmailInviteContext
  onInvited: () => void
}) {
  const { invite, sending } = useInviteToChat(context)

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto w-full min-w-0 justify-start gap-2 py-1.5 text-left"
      disabled={sending}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => void invite(email).then((sent) => sent && onInvited())}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />
      ) : (
        <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12px] text-main">
          {t('Invite {email} to {team}', { email, team: context.teamName })}
        </span>
        <span className="block whitespace-normal text-[11px] font-normal text-tertiary">
          {t('They join the team and this chat when they accept.')}
        </span>
      </span>
    </Button>
  )
}
