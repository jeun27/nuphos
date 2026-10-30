import { Popover } from '@base-ui/react/popover'
import clsx from 'clsx'

import { t } from '../../../i18n'
import { Avatar } from '../../Avatar'
import { AgentAvatar } from '../AgentAvatar'
import { TitlebarDragSuspender } from '../ShareCard'

import { RoomMembers } from './RoomMembers'
import { roomHeadline } from './roomModel'

import type { Room } from './useRoom'

const FACE = 22
const RING = 'shrink-0 !rounded-full border-2 border-agentCanvas !shadow-none'
const VISIBLE_FACES = 7

/** Everyone in the group, people first, as one overlapping row of discs. */
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

/** The row under a group's header: who is here. It opens the members panel. */
export function RoomBar({
  room,
  currentUserId,
  onOpenAgent,
}: {
  room: Room
  currentUserId: string
  onOpenAgent?: (sessionId: string) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={clsx(
          't-room-bar flex h-[38px] w-full flex-shrink-0 items-center gap-2.5 border-b border-zGray-800/60 px-3',
          'text-left text-[12.5px] text-secondary',
          'hover:bg-zGray-800/30 data-[popup-open]:bg-zGray-800/40',
        )}
        title={t('See who is in this group')}
      >
        <Faces room={room} />
        <span className="shrink-0 whitespace-nowrap">
          {roomHeadline(room.people.length, room.agents.length)}
        </span>
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
