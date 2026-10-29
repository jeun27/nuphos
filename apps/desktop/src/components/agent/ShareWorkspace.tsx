import { Popover } from '@base-ui/react/popover'
import { Loader2, Mail } from 'lucide-react'
import { useState } from 'react'

import { t } from '../../i18n'
import { Button } from '../ui/button'
import { InputGroup, InputGroupInput } from '../ui/input-group'

import { SECTION_LABEL } from './ShareCard'
import { workspaceInviteTarget } from './shareInvite'
import { useInviteToChat } from './useInviteToChat'

import type { EmailInviteContext } from './useInviteToChat'
import type { TeamMember } from '../../types'

/** The section's header: its label, and the way into team settings for an admin. */
function Header({ onOpenTeamSettings }: { onOpenTeamSettings?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className={SECTION_LABEL}>{t('Share workspace')}</div>
      {onOpenTeamSettings && (
        <Popover.Close
          render={
            <Button variant="ghost" size="sm" className="h-5 px-1 !text-[11px] font-normal" />
          }
          onClick={onOpenTeamSettings}
        >
          {t('Team settings')}
        </Popover.Close>
      )}
    </div>
  )
}

/**
 * The top of the Share card: an email in, and they are invited to the team and
 * this chat in one step, landing here once they accept. A teammate's email adds them.
 */
export function ShareWorkspace({
  context,
  teamName,
  adminName,
  onOpenTeamSettings,
  ...field
}: {
  /** Unset when the viewer may not invite: they are told whom to ask instead. */
  context?: EmailInviteContext
  teamName: string
  adminName: string | null
  members: TeamMember[] | null
  participantIds: ReadonlySet<string>
  onAddMember: (member: TeamMember) => void
  onOpenTeamSettings?: () => void
}) {
  if (context) {
    return (
      <div className="flex flex-col gap-1.5">
        <Header onOpenTeamSettings={onOpenTeamSettings} />
        <InviteField context={context} {...field} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Header onOpenTeamSettings={onOpenTeamSettings} />
      <div className="px-1 text-[12px] leading-snug text-tertiary">
        {adminName
          ? t('Not in {team} yet? Ask {admin} to invite them.', {
              team: teamName,
              admin: adminName,
            })
          : t('Not in {team} yet? Ask a team admin to invite them.', { team: teamName })}
      </div>
    </div>
  )
}

function InviteField({
  context,
  members,
  participantIds,
  onAddMember,
}: {
  context: EmailInviteContext
  members: TeamMember[] | null
  participantIds: ReadonlySet<string>
  onAddMember: (member: TeamMember) => void
}) {
  const [value, setValue] = useState('')
  const { invite, sending } = useInviteToChat(context)
  const target = workspaceInviteTarget(value, members, participantIds)
  const submit = (event: React.SyntheticEvent) => {
    event.preventDefault()
    if (target.kind === 'member') {
      onAddMember(target.member)
      setValue('')
    } else if (target.kind === 'new') {
      void invite(target.email).then((sent) => sent && setValue(''))
    }
  }

  return (
    <form className="flex flex-col gap-1.5" onSubmit={submit}>
      <div className="flex items-center gap-1.5">
        <InputGroup className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-zGray-800/60 px-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-tertiary" strokeWidth={2} />
          <InputGroupInput
            type="email"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t('Email address')}
            aria-label={t('Email to invite')}
            className="text-[12px] text-main placeholder:text-tertiary"
          />
        </InputGroup>
        <Button
          type="submit"
          variant="neutral"
          size="sm"
          disabled={sending || target.kind === 'none' || target.kind === 'here'}
        >
          {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {t('Invite')}
        </Button>
      </div>
      <div className="px-1 text-[11px] leading-snug text-tertiary">
        {target.kind === 'here'
          ? t('{name} is already in this agent.', { name: target.member.name })
          : t('They join {team} and land in this chat.', { team: context.teamName })}
      </div>
    </form>
  )
}
