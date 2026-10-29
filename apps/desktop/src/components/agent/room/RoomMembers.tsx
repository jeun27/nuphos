import { Tabs } from '@base-ui/react/tabs'
import clsx from 'clsx'
import { useState } from 'react'

import { AGENT_PROVIDER } from '../../../types/runtime'
import { Avatar } from '../../Avatar'
import { AgentAvatar } from '../AgentAvatar'
import { AgentProviderIcon } from '../panel/icons'

import { agentsBroughtBy, possessiveRuntime, roleLabel } from './roomModel'

import type { RoomAgent, RoomTab } from './roomModel'
import type { Room } from './useRoom'
import type { AgentConversationParticipant } from '../../../api/agent-types'

const ROW = 'flex items-center gap-2.5 rounded-lg px-2 py-1.5'
const SECTION = 'px-2 pb-1 pt-2 text-[11px] font-medium text-tertiary'

function PersonRow({
  person,
  agents,
  isYou,
}: {
  person: AgentConversationParticipant
  agents: RoomAgent[]
  isYou: boolean
}) {
  const brought = agentsBroughtBy(person, agents)

  return (
    <div className={ROW}>
      <Avatar src={person.avatarURL} name={person.name} size={28} className="!rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-main">
          {person.name}
          {isYou && <span className="font-normal text-tertiary"> (you)</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {brought.length === 0 ? (
            <span className="text-[11.5px] text-tertiary">No agents of their own here</span>
          ) : (
            brought.map((provider) => (
              <span
                key={provider}
                className="flex h-5 items-center gap-1 rounded border border-zGray-800/80 px-1.5 text-[11px] text-secondary"
                title={`Runs on ${person.name}’s ${AGENT_PROVIDER[provider].account} sign-in`}
              >
                <AgentProviderIcon provider={provider} className="h-3 w-3" aria-hidden />
                {possessiveRuntime(person.name, provider)}
              </span>
            ))
          )}
        </div>
      </div>
      <span className="shrink-0 text-[12px] text-tertiary">{roleLabel(person.role)}</span>
    </div>
  )
}

function AgentRow({ agent, onOpen }: { agent: RoomAgent; onOpen?: (sessionId: string) => void }) {
  const detail = [AGENT_PROVIDER[agent.provider].label, agent.runtimeLabel].filter(Boolean)

  return (
    <button
      type="button"
      onClick={() => onOpen?.(agent.sessionId)}
      className={clsx(ROW, 'w-full text-left hover:bg-zGray-800/40')}
      style={{ paddingLeft: 8 + Math.min(agent.depth, 3) * 14 }}
    >
      <AgentAvatar
        agentId={agent.sessionId}
        avatar={agent.avatar}
        provider={agent.provider}
        size={28}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-main">{agent.title}</div>
        <div className="truncate text-[11.5px] text-tertiary">{detail.join(' · ')}</div>
      </div>
      <span
        className={clsx(
          'flex shrink-0 items-center gap-1.5 text-[12px]',
          agent.working ? 'text-main' : 'text-tertiary',
        )}
      >
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full',
            agent.working ? 'animate-pulse bg-success' : 'bg-zGray-700',
          )}
        />
        {agent.working ? 'Working' : 'Idle'}
      </span>
    </button>
  )
}

const TAB =
  'h-7 rounded-md px-2.5 text-[12px] font-medium text-tertiary outline-none hover:text-main data-[active]:bg-zGray-800/60 data-[active]:text-main'

/** The members panel: who is in the room, by person and by agent. */
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
  const people = room.people.map((person) => (
    <PersonRow
      key={person.id}
      person={person}
      agents={room.agents}
      isYou={person.id === currentUserId}
    />
  ))
  const agents = room.agents.map((agent) => (
    <AgentRow key={agent.sessionId} agent={agent} onOpen={onOpenAgent} />
  ))

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value: RoomTab) => setTab(value)}
      className="flex flex-col"
    >
      <Tabs.List className="flex items-center gap-1 border-b border-zGray-800/60 p-2">
        <Tabs.Tab value="all" className={TAB}>
          All {room.people.length + room.agents.length}
        </Tabs.Tab>
        <Tabs.Tab value="people" className={TAB}>
          People {room.people.length}
        </Tabs.Tab>
        <Tabs.Tab value="agents" className={TAB}>
          Agents {room.agents.length}
        </Tabs.Tab>
      </Tabs.List>
      <div className="max-h-[420px] overflow-y-auto p-1.5">
        <Tabs.Panel value="all">
          <div className={SECTION}>People</div>
          {people}
          <div className={SECTION}>Agents</div>
          {agents}
        </Tabs.Panel>
        <Tabs.Panel value="people">{people}</Tabs.Panel>
        <Tabs.Panel value="agents">{agents}</Tabs.Panel>
      </div>
    </Tabs.Root>
  )
}
