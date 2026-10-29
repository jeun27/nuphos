import { useState } from 'react'

import { t } from '../../../i18n'
import { Button } from '../../ui/button'
import { toast } from '../../ui/toast'

import { firstName } from './roomModel'

import type { AgentConversationParticipant } from '../../../api/agent-types'
import type { LocalShareApproval } from '../../../api/device-types'

/** One teammate waiting for the owner to let their message run on the owner's computer. */
export function RoomApprovalCard({
  approval,
  people,
  onDecide,
}: {
  approval: LocalShareApproval
  people: readonly AgentConversationParticipant[]
  onDecide: (approvalId: string, approve: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const person = people.find((entry) => entry.id === approval.actorId)
  const name = person ? firstName(person.name) : t('A teammate')
  const answer = (approve: boolean) => {
    setBusy(true)
    onDecide(approval.id, approve)
      .catch((err: unknown) => toast.apiError(t('Couldn’t answer the request'), err))
      .finally(() => setBusy(false))
  }

  return (
    <div className="mx-1 mb-1.5 flex items-center gap-2 rounded-lg border border-zGray-800/80 bg-main px-3 py-2 text-[12.5px] text-secondary">
      <span className="min-w-0 flex-1">
        {t(
          '{name} wants to steer this room on your {device}. Their message runs once you allow it.',
          {
            name,
            device: approval.deviceLabel,
          },
        )}
      </span>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => answer(false)}>
        {t('Decline')}
      </Button>
      <Button size="sm" disabled={busy} onClick={() => answer(true)}>
        {t('Allow')}
      </Button>
    </div>
  )
}
