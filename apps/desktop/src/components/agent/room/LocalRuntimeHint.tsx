import { Lock } from 'lucide-react'

import { t } from '../../../i18n'
import { isLocalAgentRuntime } from '../../../lib/localAgentSharing'
import { Button } from '../../ui/button'

import { firstName } from './roomModel'
import { requestRuntimeMenu } from './runtimeMenuRequest'
import { useRoom } from './useRoom'

import type { Tab } from '../panel/model'

/**
 * A teammate in a chat on its owner's computer can read but not send: the
 * backend refuses their message. Say so before they type, and offer the move
 * to anyone allowed to make it.
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
  const owner = useRoom(tab.sessionId, teamId).people.find((person) => person.isOwner)

  if (!tab.foreign || !isLocalAgentRuntime(tab.runtimeId)) return null
  const name = owner ? firstName(owner.name) : t('its owner')

  return (
    <div className={sidebar ? 'w-full' : 'mx-auto w-full max-w-[760px]'}>
      <div className="mx-1 mb-1.5 flex items-center gap-2 rounded-lg bg-zGray-800/40 px-3 py-2 text-[12.5px] text-secondary">
        <Lock className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
        <span className="min-w-0 flex-1">
          {t('Runs on {name}’s computer, so only {name} can send here.', { name })}
        </span>
        {tab.canManage && (
          <Button size="sm" variant="secondary" onClick={() => requestRuntimeMenu(tab.sessionId)}>
            {t('Move to a team runtime')}
          </Button>
        )}
      </div>
    </div>
  )
}
