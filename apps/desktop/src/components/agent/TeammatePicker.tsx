import clsx from 'clsx'
import { Loader2, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

import { t } from '../../i18n'
import { Avatar } from '../Avatar'
import { InputGroup, InputGroupInput } from '../ui/input-group'

import { Button } from '../ui/button'

import { InviteByEmail } from './InviteByEmail'
import { emailToInvite } from './room/pendingInvites'
import { RoleMenu } from './ShareAccess'
import { CheckBadge } from './ShareCard'

import type { EmailInviteContext } from './InviteByEmail'
import type { ParticipantRole } from '../../api/agent-types'
import type { TeamMember } from '../../types'

function addLabel(count: number) {
  if (count === 0) return t('Add to agent')

  return count === 1 ? t('Add 1 person') : t('Add {n} people', { n: String(count) })
}

function matches(member: TeamMember, query: string) {
  const q = query.trim().toLowerCase()

  return !q || member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q)
}

/**
 * Teammates as a face grid under one search field. The field holds the picks
 * as chips on a single line that scrolls sideways instead of wrapping, so the
 * card never changes height as people are picked; typing narrows the grid,
 * which is what keeps a large team pickable.
 */
export function TeammatePicker({
  members,
  invitable,
  picked,
  disabled,
  onToggle,
  teamName,
  emailInvite,
}: {
  members: TeamMember[] | null
  invitable: TeamMember[]
  picked: TeamMember[]
  disabled: boolean
  onToggle: (member: TeamMember) => void
  teamName: string
  /** Set for a team admin: an email that names nobody in the team can be invited to it. */
  emailInvite?: EmailInviteContext
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pickedIds = new Set(picked.map((member) => member.id))
  const shown = invitable.filter((member) => matches(member, query))
  const email = emailToInvite(query, members)
  const newcomer =
    email &&
    (emailInvite ? (
      <InviteByEmail email={email} context={emailInvite} />
    ) : (
      <div className="px-1 text-[12px] text-tertiary">
        {t('{email} isn’t in {team}. Ask a team admin to invite them.', { email, team: teamName })}
      </div>
    ))

  // Keep the newest chip and the caret in view as the line grows. Scrolling the
  // line itself, not scrollIntoView, which would move every scrolling ancestor.
  useLayoutEffect(() => {
    const line = inputRef.current?.parentElement

    if (line) line.scrollLeft = line.scrollWidth
  }, [picked.length])

  const toggle = (member: TeamMember) => {
    onToggle(member)
    setQuery('')
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && query && shown[0]) {
      event.preventDefault()
      toggle(shown[0])
    } else if (event.key === 'Backspace' && !query && picked.length > 0) {
      onToggle(picked[picked.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="px-1 text-[11px] font-medium text-tertiary">{t('Add teammates')}</div>
      <InputGroup
        className="flex h-8 items-center gap-1 overflow-x-auto rounded-lg border border-zGray-800/60 px-1 [scrollbar-width:none]"
        onClick={() => inputRef.current?.focus()}
      >
        {picked.map((member) => (
          <span
            key={member.id}
            className="t-share-in flex h-6 shrink-0 items-center gap-1 rounded-full bg-zGray-800/60 pl-0.5 pr-1 text-[12px] text-main"
          >
            <Avatar src={member.avatarURL} name={member.name} size={20} className="!rounded-full" />
            <span className="max-w-[96px] truncate">{member.name}</span>
            <button
              type="button"
              className="rounded-full p-0.5 text-tertiary hover:text-main"
              aria-label={t('Unpick {name}', { name: member.name })}
              onClick={() => onToggle(member)}
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        <InputGroupInput
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={picked.length === 0 ? t('Search teammates') : t('Add more…')}
          aria-label={t('Search teammates')}
          className="min-w-[96px] px-1 text-[12px] text-main placeholder:text-tertiary"
        />
      </InputGroup>
      {!members && (
        <div className="flex items-center gap-2 px-1 text-[12px] text-tertiary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          {t('Loading members…')}
        </div>
      )}
      {members &&
        invitable.length === 0 &&
        (newcomer || <EveryoneHere team={teamName} canInvite={Boolean(emailInvite)} />)}
      {/* Sized by the whole team, not by the matches, so typing never resizes the card. */}
      {invitable.length > 0 && (
        <div
          className={clsx(
            'grid auto-rows-min grid-cols-5 gap-y-1 overflow-auto scrollbar-thin',
            invitable.length > 5 ? 'h-[156px]' : 'h-[68px]',
          )}
        >
          {shown.length === 0 && (
            <div className="col-span-5 px-1 text-[12px] text-tertiary">
              {newcomer || t('No teammates match.')}
            </div>
          )}
          {shown.map((member) => {
            const selected = pickedIds.has(member.id)

            return (
              <button
                key={member.id}
                type="button"
                aria-pressed={selected}
                title={member.name}
                disabled={disabled}
                // A press would pull focus out of the search field and blink its
                // ring; picking with the mouse should leave focus where it was.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggle(member)}
                className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 transition-colors hover:bg-zGray-800/40"
              >
                <span
                  className={clsx(
                    'relative rounded-full ring-2 ring-offset-2 ring-offset-[rgb(var(--color-background-base))] transition-shadow',
                    selected ? 'ring-zViolet-accent' : 'ring-transparent',
                  )}
                >
                  <Avatar
                    src={member.avatarURL}
                    name={member.name}
                    size={36}
                    className="!rounded-full"
                  />
                  {selected && <CheckBadge className="-bottom-0.5 -right-0.5 bg-zViolet-500" />}
                </span>
                <span className="w-full truncate text-[11px] text-secondary">
                  {member.name.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Nobody left to add: say so, and how to add someone new when the viewer can. */
function EveryoneHere({ team, canInvite }: { team: string; canInvite: boolean }) {
  return (
    <div className="px-1 text-[12px] text-tertiary">
      {canInvite
        ? t('Everyone in {team} is here. To add someone new, type their email.', { team })
        : t('Everyone in {team} is already here.', { team })}
    </div>
  )
}

/** The role the picks join with, and the button that adds them. */
export function AddPickedRow({
  role,
  onRoleChange,
  count,
  pending,
  onAdd,
}: {
  role: ParticipantRole
  onRoleChange: (role: ParticipantRole) => void
  count: number
  pending: string | null
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <RoleMenu value={role} onChange={onRoleChange} />
      <Button
        variant="neutral"
        size="sm"
        className="flex-1"
        disabled={count === 0 || pending !== null}
        onClick={onAdd}
      >
        {pending === 'invite' && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
        {pending === 'invite' ? t('Adding…') : addLabel(count)}
      </Button>
    </div>
  )
}
