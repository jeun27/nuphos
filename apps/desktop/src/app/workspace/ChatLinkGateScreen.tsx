import { Loader2, Lock, MailOpen } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import { toast } from '../../components/ui/toast'
import { t } from '../../i18n'

import type { TeamInvitation } from '../../types'

/**
 * What a chat link into a team this account is not in shows instead of the
 * chat: the invitation to accept, or who to ask. Nothing of that team loads
 * behind it. A non-member cannot read the team's name unless invited to it.
 */
export function ChatLinkGateScreen({
  invitation,
  onAccept,
  onDismiss,
}: {
  invitation: TeamInvitation | null
  onAccept: () => Promise<void>
  onDismiss: () => void
}) {
  const [accepting, setAccepting] = useState(false)
  const teamName = invitation?.team?.name
  const accept = () => {
    setAccepting(true)
    onAccept()
      .catch((err: unknown) => toast.apiError(t('Failed to accept the invitation'), err))
      .finally(() => setAccepting(false))
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-main">
      <div className="titlebar-drag h-[44px] flex-shrink-0 border-b border-zGray-800/60" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zGray-800/60 text-secondary">
          {invitation ? (
            <MailOpen className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Lock className="h-5 w-5" strokeWidth={1.75} />
          )}
        </span>
        <div className="flex max-w-[420px] flex-col gap-1.5">
          <h2 className="text-[15px] font-medium text-main">
            {invitation
              ? t('This chat is in {team}.', { team: teamName ?? t('another team') })
              : t('This chat is in a team you’re not in yet.')}
          </h2>
          <p className="text-[13px] leading-relaxed text-secondary">
            {invitation
              ? t('You’ve been invited — accept to open it.')
              : t(
                  'Ask the person who shared it to invite you to their team, then open the link again.',
                )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invitation && (
            <Button size="sm" disabled={accepting} onClick={accept}>
              {accepting && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
              {t('Accept invite')}
            </Button>
          )}
          <Button size="sm" variant="secondary" disabled={accepting} onClick={onDismiss}>
            {t('Go back')}
          </Button>
        </div>
      </div>
    </div>
  )
}
