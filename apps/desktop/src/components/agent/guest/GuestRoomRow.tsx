import { Tabs } from '@base-ui/react/tabs'
import clsx from 'clsx'

import { t } from '../../../i18n'
import { Avatar } from '../../Avatar'
import { AgentAvatar } from '../AgentAvatar'
import { GuestBadge, NameTag } from '../room/GuestBadge'

import { guestAgents, guestPeople } from './guestModel'

import type { AgentGuestConversation } from '../../../api/agent-types'

const LINE = 'flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]'
const LABEL = 'w-[52px] shrink-0 text-[11px] font-medium text-tertiary'
const TAB =
  'flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-secondary outline-none hover:bg-zGray-800/40 hover:text-main data-[active]:bg-zGray-800/60 data-[active]:text-main'

/**
 * Who shares the chat, and the agents of its tree as tabs: picking one shows
 * that chat. Nothing here is editable; a guest only looks.
 */
export function GuestRoomRow({
  data,
  shown,
  currentUserId,
  onShow,
}: {
  data: AgentGuestConversation
  shown: string
  currentUserId: string
  onShow: (sessionId: string) => void
}) {
  const agents = guestAgents(data.tree)

  return (
    <div className="flex flex-shrink-0 flex-col gap-1.5 border-b border-zGray-800/60 px-3 py-2">
      <div className={LINE}>
        <span className={LABEL}>{t('People')}</span>
        {guestPeople(data.people).map((person) => (
          <span
            key={person.id}
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-main"
          >
            <Avatar src={person.avatarURL} name={person.name} size={20} className="!rounded-full" />
            <span className="max-w-[160px] truncate">
              {person.name}
              {person.id === currentUserId && <span className="text-tertiary"> {t('(you)')}</span>}
            </span>
            {person.isOwner && <NameTag>{t('Owner')}</NameTag>}
            {person.role === 'guest' && <GuestBadge />}
          </span>
        ))}
      </div>
      {agents.length > 1 && (
        <Tabs.Root value={shown} onValueChange={(value: string) => onShow(value)}>
          <Tabs.List className={LINE} aria-label={t('Agents')}>
            <span className={LABEL}>{t('Agents')}</span>
            {agents.map((agent) => (
              <Tabs.Tab key={agent.sessionId} value={agent.sessionId} className={TAB}>
                {agent.depth > 0 && (
                  <span className="text-tertiary" aria-hidden>
                    {'›'.repeat(Math.min(agent.depth, 3))}
                  </span>
                )}
                <AgentAvatar agentId={agent.sessionId} provider={agent.provider} size={18} />
                <span className="max-w-[180px] truncate">{agent.title}</span>
                <span
                  className={clsx(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    agent.working ? 'bg-success' : 'bg-zGray-700',
                  )}
                  title={agent.working ? t('Working') : t('Idle')}
                />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}
    </div>
  )
}
