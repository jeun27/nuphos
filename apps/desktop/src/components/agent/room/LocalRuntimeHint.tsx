import { Laptop } from 'lucide-react'

import { t } from '../../../i18n'
import { useShareApprovals } from '../../../views/inbox/useShareApprovals'
import { Button } from '../../ui/button'
import { useShareApprovalStatus } from '../panel/useShareApprovalWait'

import { RoomApprovalCard } from './RoomApprovalCard'
import { firstName, roomSteering } from './roomModel'
import { requestRuntimeMenu } from './runtimeMenuRequest'
import { useRoom } from './useRoom'

import type { Tab } from '../panel/model'

const STRIP =
  'mx-1 mb-1.5 flex items-center gap-2 rounded-lg bg-zGray-800/40 px-3 py-2 text-[12.5px] text-secondary'

function teammateLine(asks: boolean, status: string | null, name: string) {
  if (!asks) return t('Runs on {name}’s computer. {name} lets the team steer this room.', { name })
  if (status === 'denied')
    return t('{name} declined running your messages here on their computer.', { name })
  if (status === 'pending')
    return t('Your message is waiting for {name} to allow it on their computer.', { name })
  if (status === 'approved')
    return t('{name} allowed your messages here on their computer.', { name })

  return t('Runs on {name}’s computer. Your first message here waits for {name} to allow it.', {
    name,
  })
}

/**
 * Above the composer of a room on its owner's computer. A teammate sees
 * whether their messages run or wait for the owner; the owner sees each
 * teammate waiting on them, with Allow right there.
 */
export function LocalRuntimeHint({
  tab,
  teamId,
  sidebar = false,
}: {
  tab: Pick<Tab, 'sessionId' | 'runtimeId' | 'foreign' | 'canManage'>
  teamId: string
  sidebar?: boolean
}) {
  const room = useRoom(tab.sessionId, teamId)
  const { steering, owner } = roomSteering(room)
  const asks = steering === 'ask'
  const status = useShareApprovalStatus(tab.foreign && asks ? tab.sessionId : undefined)
  const waiting = useShareApprovals(!tab.foreign && asks ? teamId : '')
  const inRoom = new Set(room.agents.map((agent) => agent.sessionId))
  const requests = waiting.approvals.filter((approval) => inRoom.has(approval.sessionId))
  const name = owner ? firstName(owner.name) : t('its owner')
  const frame = sidebar ? 'w-full' : 'mx-auto w-full max-w-[760px]'

  if (steering === 'open') return null
  if (!tab.foreign)
    return requests.length === 0 ? null : (
      <div className={frame}>
        {requests.map((approval) => (
          <RoomApprovalCard
            key={approval.id}
            approval={approval}
            people={room.people}
            onDecide={waiting.decide}
          />
        ))}
      </div>
    )
  const text = teammateLine(asks, status, name)

  return (
    <div className={frame}>
      <div className={STRIP}>
        <Laptop className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
        <span className="min-w-0 flex-1">{text}</span>
        {tab.canManage && (
          <Button size="sm" variant="secondary" onClick={() => requestRuntimeMenu(tab.sessionId)}>
            {t('Move to a team runtime')}
          </Button>
        )}
      </div>
    </div>
  )
}
