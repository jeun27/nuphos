import { Tabs } from '@base-ui/react/tabs'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { AGENT_PROVIDER } from '../../../types/runtime'
import { Avatar } from '../../Avatar'
import { Button } from '../../ui/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/menu'
import { toast } from '../../ui/toast'
import { AgentAvatar } from '../AgentAvatar'

import { AddAgents } from './AddAgents'
import { AddPeople } from './AddPeople'
import { canRemoveAgent, roleLabel } from './roomModel'

import type { RoomAgent, RoomTab } from './roomModel'
import type { Room } from './useRoom'
import type { AgentConversationParticipant } from '../../../api/agent-types'

const ROW = 'flex items-center gap-2.5 rounded-lg px-2 py-1.5'
const SECTION = 'px-2 pb-1 pt-2 text-[11px] font-medium text-tertiary'
const TAB =
  'h-7 rounded-md px-2.5 text-[12px] font-medium text-tertiary outline-none hover:text-main data-[active]:bg-zGray-800/60 data-[active]:text-main'

function PersonRow({ person, isYou }: { person: AgentConversationParticipant; isYou: boolean }) {
  return (
    <div className={ROW}>
      <Avatar src={person.avatarURL} name={person.name} size={28} className="!rounded-full" />
      <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-main">
        {person.name}
        {isYou && <span className="font-normal text-tertiary"> {t('(you)')}</span>}
      </div>
      <span className="shrink-0 text-[12px] text-tertiary">{roleLabel(person.role)}</span>
    </div>
  )
}

function AgentRow({
  agent,
  room,
  currentUserId,
  onOpen,
}: {
  agent: RoomAgent
  room: Room
  currentUserId: string
  onOpen?: (sessionId: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const remove = () => {
    setRemoving(true)
    api
      .agentRemoveGroupAgent(room.groupId, room.teamId, agent.sessionId)
      .then(() => room.setAgents(room.agents.filter((each) => each.sessionId !== agent.sessionId)))
      .catch((err: unknown) => toast.apiError(t('Could not remove the agent'), err))
      .finally(() => setRemoving(false))
  }
  const face = (
    <AgentAvatar
      agentId={agent.sessionId}
      avatar={agent.avatar}
      provider={agent.provider}
      size={28}
    />
  )
  const name = <span className="truncate text-[13px] font-medium text-main">{agent.title}</span>

  return (
    <div className={ROW}>
      {face}
      <div className="min-w-0 flex-1">
        {agent.readable && onOpen ? (
          <button
            type="button"
            className="block max-w-full truncate text-left hover:underline"
            onClick={() => onOpen(agent.sessionId)}
          >
            {name}
          </button>
        ) : (
          <div className="truncate">{name}</div>
        )}
        {agent.provider && (
          <div className="truncate text-[11.5px] text-tertiary">
            {AGENT_PROVIDER[agent.provider].label}
          </div>
        )}
      </div>
      {canRemoveAgent(agent, currentUserId, room.viewerOwnsGroup) && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('Remove {name}', { name: agent.title })}
          title={t('Remove {name}', { name: agent.title })}
          disabled={removing}
          onClick={remove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

type View = 'members' | 'add-people' | 'add-agents'

/** The members panel: who is in the group, by person and by agent. */
export function RoomMembers({
  room,
  currentUserId,
  onOpenAgent,
}: {
  room: Room
  currentUserId: string
  onOpenAgent?: (sessionId: string) => void
}) {
  const [tab, setTab] = useState<RoomTab>('all')
  const [view, setView] = useState<View>('members')

  if (view === 'add-people') return <AddPeople room={room} onDone={() => setView('members')} />
  if (view === 'add-agents') return <AddAgents room={room} onDone={() => setView('members')} />
  const people = room.people.map((person) => (
    <PersonRow key={person.id} person={person} isYou={person.id === currentUserId} />
  ))
  const agents =
    room.agents.length === 0 ? (
      <div className="px-2 py-1.5 text-[12px] text-tertiary">{t('No agents yet')}</div>
    ) : (
      room.agents.map((agent) => (
        <AgentRow
          key={agent.sessionId}
          agent={agent}
          room={room}
          currentUserId={currentUserId}
          onOpen={onOpenAgent}
        />
      ))
    )

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value: RoomTab) => setTab(value)}
      className="flex flex-col"
    >
      <div className="flex items-center gap-1 border-b border-zGray-800/60 p-2">
        <Tabs.List className="flex flex-1 items-center gap-1">
          <Tabs.Tab value="all" className={TAB}>
            {t('All {count}', { count: room.people.length + room.agents.length })}
          </Tabs.Tab>
          <Tabs.Tab value="people" className={TAB}>
            {t('People {count}', { count: room.people.length })}
          </Tabs.Tab>
          <Tabs.Tab value="agents" className={TAB}>
            {t('Agents {count}', { count: room.agents.length })}
          </Tabs.Tab>
        </Tabs.List>
        {room.viewerOwnsGroup && (
          <Menu>
            <MenuTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-1 px-2" />}>
              <Plus className="h-3.5 w-3.5" />
              {t('Add')}
            </MenuTrigger>
            <MenuContent align="end" className="w-[180px]">
              <MenuItem onClick={() => setView('add-people')}>{t('Add people')}</MenuItem>
              <MenuItem onClick={() => setView('add-agents')}>{t('Add agents')}</MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>
      <div className="max-h-[420px] overflow-y-auto p-1.5">
        <Tabs.Panel value="all">
          <div className={SECTION}>{t('People')}</div>
          {people}
          <div className={SECTION}>{t('Agents')}</div>
          {agents}
        </Tabs.Panel>
        <Tabs.Panel value="people">{people}</Tabs.Panel>
        <Tabs.Panel value="agents">{agents}</Tabs.Panel>
      </div>
    </Tabs.Root>
  )
}
