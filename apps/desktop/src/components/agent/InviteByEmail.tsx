import { Check, Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../api'
import { t } from '../../i18n'
import { Button } from '../ui/button'
import { toast } from '../ui/toast'

import { announceTeamInvitationsChanged } from './room/pendingInvites'

import type { ParticipantRole } from '../../api/agent-types'

export type EmailInviteContext = {
  teamId: string
  teamName: string
  sessionId: string
  role: ParticipantRole
}

/**
 * Someone who is not in the team yet: a team admin invites them by email, and
 * the invitation carries this chat, so accepting opens it for them.
 */
export function InviteByEmail({ email, context }: { email: string; context: EmailInviteContext }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const { teamId, teamName, sessionId, role } = context

  const invite = () => {
    setSending(true)
    api
      .atlasInviteTeamMember(teamId, email, { sessionId, role })
      .then(() => {
        setSent(email)
        announceTeamInvitationsChanged(teamId)
        toast.success(t('Invited {email} to {team}', { email, team: teamName }))
      })
      .catch((err: unknown) => toast.apiError(t('Failed to invite {email}', { email }), err))
      .finally(() => setSending(false))
  }

  if (sent === email) {
    return (
      <div className="flex items-center gap-2 px-1 text-[12px] text-secondary">
        <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
        {t('Invited. They’ll join {team} and this chat when they accept.', { team: teamName })}
      </div>
    )
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
        <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12px] text-main">
          {t('Invite {email} to {team}', { email, team: teamName })}
        </span>
        <span className="block whitespace-normal text-[11px] font-normal text-tertiary">
          {t('They join the team and this chat when they accept.')}
        </span>
      </span>
    </Button>
  )
}
