import { Popover } from '@base-ui/react/popover'
import clsx from 'clsx'
import { Laptop } from 'lucide-react'

import { t } from '../../../i18n'
import { AGENT_PROVIDER } from '../../../types/runtime'
import { Avatar } from '../../Avatar'
import { AgentAvatar } from '../AgentAvatar'
import { AgentProviderIcon } from '../panel/icons'
import { TitlebarDragSuspender } from '../ShareCard'

import { RoomMembers } from './RoomMembers'
import {
  firstName,
  guestName,
  roomHeadline,
  roomIsShared,
  roomProviders,
  roomSteering,
} from './roomModel'
import { useRoom } from './useRoom'

import type { Room } from './useRoom'

const FACE = 22
const RING = 'shrink-0 !rounded-full border-2 border-agentCanvas !shadow-none'
const VISIBLE_FACES = 7

/** Everyone in the room, people then guests then agents, as one overlapping row of discs. */
function Faces({ room }: { room: Room }) {
  const faces = [
    ...room.people.map((person) => (
      <Avatar
        key={person.id}
        src={person.avatarURL}
        name={person.name}
        size={FACE}
        className={clsx(RING, person.deactivated && 'opacity-50')}
      />
    )),
    ...room.guests.map((guest) => (
      <Avatar
        key={guest.key}
        src={guest.avatarURL}
        name={guestName(guest)}
        size={FACE}
        className={clsx(RING, guest.pending && 'opacity-50')}
      />
    )),
    ...room.agents.map((agent) => (
      <span key={agent.sessionId} className={clsx(RING, 'bg-agentCanvas')}>
        <AgentAvatar
          agentId={agent.sessionId}
          avatar={agent.avatar}
          provider={agent.provider}
          size={FACE - 4}
        />
      </span>
    )),
  ]
  const hidden = faces.length - VISIBLE_FACES

  return (
    <span className="flex -space-x-1.5">
      {faces.slice(0, VISIBLE_FACES)}
      {hidden > 0 && (
        <span
          className={clsx(
            RING,
            'flex items-center justify-center bg-zGray-800 text-[10px] text-secondary',
          )}
          style={{ width: FACE, height: FACE }}
        >
          +{hidden}
        </span>
      )}
    </span>
  )
}

/** On its owner's computer, say who decides what teammates' messages may do. */
function SendRuleChip({ room, currentUserId }: { room: Room; currentUserId: string }) {
  const { steering, owner } = roomSteering(room)

  if (steering === 'open') return null
  const yours = !owner || owner.id === currentUserId
  const name = owner ? firstName(owner.name) : ''
  let text = yours
    ? t('On your computer · you OK each teammate')
    : t('On {name}’s computer · {name} OKs each teammate', { name })

  if (steering === 'team')
    text = yours
      ? t('On your computer · team can steer')
      : t('On {name}’s computer · team can steer', { name })

  return (
    <span className="ml-auto flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-zGray-800/50 px-2 text-[12px] text-secondary">
      <Laptop className="h-3 w-3" aria-hidden />
      {text}
    </span>
  )
}

/**
 * The row under a chat's header that says who shares it: people and agents,
 * and the agents they run on. It opens the members panel.
 */
export function RoomBar({
  room,
  currentUserId,
  onOpenAgent,
}: {
  room: Room
  currentUserId: string
  onOpenAgent?: (sessionId: string) => void
}) {
  if (!roomIsShared(room.people.length, room.agents.length, room.guests.length)) return null

  return (
    <Popover.Root>
      <Popover.Trigger
        className={clsx(
          't-room-bar flex h-[38px] w-full flex-shrink-0 items-center gap-2.5 border-b border-zGray-800/60 px-3',
          'text-left text-[12.5px] text-secondary transition-colors',
          'hover:bg-zGray-800/30 data-[popup-open]:bg-zGray-800/40',
        )}
        title={t('See who is in this agent room')}
      >
        <Faces room={room} />
        <span className="shrink-0 whitespace-nowrap">
          {roomHeadline(room.people.length, room.agents.length, room.guests.length)}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {roomProviders(room.agents).map((provider) => (
            <span
              key={provider}
              className="flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-zGray-800/80 bg-main px-2 text-[12px] font-medium text-main"
            >
              <AgentProviderIcon provider={provider} className="h-3.5 w-3.5" aria-hidden />
              {AGENT_PROVIDER[provider].label}
            </span>
          ))}
        </span>
        <SendRuleChip room={room} currentUserId={currentUserId} />
      </Popover.Trigger>
      <Popover.Portal>
        <TitlebarDragSuspender />
        <Popover.Positioner align="start" sideOffset={4} collisionPadding={12} className="z-[1000]">
          <Popover.Popup
            className={(state) =>
              clsx(
                't-dropdown w-[360px] rounded-xl border border-zGray-800/60 bg-main shadow-[0_10px_28px_-6px_rgba(0,0,0,0.35)] outline-none',
                state.open && 'is-open',
                state.transitionStatus === 'ending' && 'is-closing',
              )
            }
            style={{ transformOrigin: 'top left' }}
          >
            <RoomMembers room={room} currentUserId={currentUserId} onOpenAgent={onOpenAgent} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The room bar for one chat, fed from what the app already loaded. */
export function SessionRoomBar({
  sessionId,
  teamId,
  ...rest
}: {
  sessionId: string
  teamId: string
  currentUserId: string
  onOpenAgent?: (sessionId: string) => void
}) {
  return <RoomBar room={useRoom(sessionId, teamId)} {...rest} />
}
