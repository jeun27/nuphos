import { Popover } from '@base-ui/react/popover'
import { Lock } from 'lucide-react'

import { t } from '../../../i18n'
import { Button } from '../../ui/button'

import { firstName } from './roomModel'
import { requestRuntimeMenu } from './runtimeMenuRequest'

/**
 * Why only the owner can send in a room on their own computer, and the way
 * out: the owner gets the runtime list the composer already has, a teammate
 * learns whom to ask.
 */
export function RoomSendNotice({
  sessionId,
  ownerName,
  viewerIsOwner,
}: {
  sessionId: string
  ownerName?: string
  viewerIsOwner: boolean
}) {
  const name = ownerName ? firstName(ownerName) : t('its owner')

  return (
    <div className="mx-2 mt-2 flex items-start gap-2 rounded-lg bg-zGray-800/40 px-3 py-2.5 text-[12px] leading-[17px] text-secondary">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
      <div className="flex min-w-0 flex-col items-start gap-2">
        {viewerIsOwner
          ? t(
              'This room runs on your computer, so teammates can read along but not send, here or in its sub-agents.',
            )
          : t(
              'This room runs on {name}’s computer, so only {name} can send, here and in its sub-agents. Ask {name} to move it to a team runtime to work on it together.',
              { name },
            )}
        {viewerIsOwner && (
          <Popover.Close
            render={<Button size="sm" variant="secondary" />}
            onClick={() => requestRuntimeMenu(sessionId)}
          >
            {t('Move to a team runtime')}
          </Popover.Close>
        )}
      </div>
    </div>
  )
}
