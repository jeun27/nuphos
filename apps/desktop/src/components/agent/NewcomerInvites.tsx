import { Check, Eye, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { t } from '../../i18n'
import { Button } from '../ui/button'

import { InviteByEmail } from './InviteByEmail'

import type { EmailInviteContext } from './InviteByEmail'
import type { ConversationGuest } from '../../api/agent-types'

export type GuestInviteContext = {
  guests: ConversationGuest[]
  /** Resolves once the guest is on the chat's list. */
  onInvite: (email: string) => Promise<void>
}

/** The owner's way in for someone outside the team: view this one chat, nothing else. */
function InviteGuest({
  email,
  teamName,
  context,
}: {
  email: string
  teamName: string
  context: GuestInviteContext
}) {
  const [sending, setSending] = useState(false)

  if (context.guests.some((guest) => guest.email.toLowerCase() === email)) {
    return (
      <div className="flex items-center gap-2 px-1 text-[12px] text-secondary">
        <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
        {t('Invited as a guest. They’ll get a link to this chat.')}
      </div>
    )
  }

  const invite = () => {
    setSending(true)
    void context.onInvite(email).finally(() => setSending(false))
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto w-full min-w-0 justify-start gap-2 py-1.5 text-left"
      disabled={sending}
      onMouseDown={(event) => event.preventDefault()}
      onClick={invite}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />
      ) : (
        <Eye className="h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12px] text-main">
          {t('Invite {email} as a guest', { email })}
        </span>
        <span className="block whitespace-normal text-[11px] font-normal text-tertiary">
          {t('View only. They see this chat and its sub-agents, nothing else in {team}.', {
            team: teamName,
          })}
        </span>
      </span>
    </Button>
  )
}

/**
 * An email that names nobody in the team: a team admin can invite them to it,
 * and the owner can let them view this chat as a guest.
 */
export function NewcomerInvites({
  email,
  teamName,
  emailInvite,
  guestInvite,
}: {
  email: string
  teamName: string
  emailInvite?: EmailInviteContext
  guestInvite?: GuestInviteContext
}) {
  if (!emailInvite && !guestInvite) {
    return (
      <div className="px-1 text-[12px] text-tertiary">
        {t('{email} isn’t in {team}. Ask a team admin to invite them.', { email, team: teamName })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {emailInvite && <InviteByEmail email={email} context={emailInvite} />}
      {guestInvite && <InviteGuest email={email} teamName={teamName} context={guestInvite} />}
    </div>
  )
}
