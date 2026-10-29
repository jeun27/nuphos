import { Popover } from '@base-ui/react/popover'
import { Laptop } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { Button } from '../../ui/button'
import { Switch } from '../../ui/Switch'
import { toast } from '../../ui/toast'

import { firstName } from './roomModel'
import { requestRuntimeMenu } from './runtimeMenuRequest'

import type { RoomSteering } from './roomModel'

/**
 * A room on its owner's own computer. The owner decides whether teammates'
 * messages run without asking, and can move the room instead; a teammate
 * sees which way the owner decided.
 */
export function RoomSendNotice({
  steering,
  rootId,
  hereId,
  teamId,
  ownerName,
  viewerIsOwner,
}: {
  steering: Exclude<RoomSteering, 'open'>
  rootId: string
  hereId: string
  teamId: string
  ownerName?: string
  viewerIsOwner: boolean
}) {
  const [chosen, setChosen] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const teamSteers = chosen ?? steering === 'team'
  const name = ownerName ? firstName(ownerName) : t('its owner')

  const save = (enabled: boolean) => {
    setSaving(true)
    setChosen(enabled)
    api
      .agentSetConversationTeamSteer(rootId, teamId, enabled)
      .catch((err: unknown) => {
        setChosen(null)
        toast.apiError(t('Couldn’t change who can steer this room'), err)
      })
      .finally(() => setSaving(false))
  }

  if (!viewerIsOwner)
    return (
      <div className="mx-2 mt-2 flex items-start gap-2 rounded-lg bg-zGray-800/40 px-3 py-2.5 text-[12px] leading-[17px] text-secondary">
        <Laptop className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
        {teamSteers
          ? t('This room runs on {name}’s computer, and {name} lets the team steer it.', { name })
          : t(
              'This room runs on {name}’s computer. Your first message here waits for {name} to allow it.',
              { name },
            )}
      </div>
    )

  return (
    <div className="mx-2 mt-2 flex flex-col gap-2 rounded-lg bg-zGray-800/40 px-3 py-2.5 text-[12px] leading-[17px] text-secondary">
      <div className="flex items-center gap-2">
        <Laptop className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
        <span className="min-w-0 flex-1 font-medium text-main">
          {t('Let the team steer on my computer in this room')}
        </span>
        <Switch
          checked={teamSteers}
          disabled={saving}
          onChange={save}
          label={t('Let the team steer on my computer in this room')}
        />
      </div>
      <span>
        {teamSteers
          ? t(
              'Teammates’ messages here and in its sub-agents run on your computer with your agent sign-in. Turn it off any time.',
            )
          : t('Teammates can send here. Each person’s first message waits for your OK in Inbox.')}
      </span>
      <Popover.Close
        render={<Button size="sm" variant="secondary" className="self-start" />}
        onClick={() => requestRuntimeMenu(hereId)}
      >
        {t('Move to a team runtime')}
      </Popover.Close>
    </div>
  )
}
