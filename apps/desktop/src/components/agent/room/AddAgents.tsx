import clsx from 'clsx'
import { useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { AGENT_PROVIDER } from '../../../types/runtime'
import { Button } from '../../ui/button'
import { toast } from '../../ui/toast'
import { AgentAvatar } from '../AgentAvatar'

import { addableAgents } from './roomModel'

import type { Room } from './useRoom'
import type { AgentConversation } from '../../../api/agent-types'

const titleOf = (conversation: AgentConversation) =>
  conversation.title || conversation.firstMessage || t('Untitled agent')

/** Brings one of the viewer's own agents in, after saying what that shares. */
export function AddAgents({ room, onDone }: { room: Room; onDone: () => void }) {
  const [chosen, setChosen] = useState<AgentConversation | null>(null)
  const [saving, setSaving] = useState(false)
  const candidates = addableAgents(
    room.listed,
    room.agents.map((agent) => agent.sessionId),
  )
  const add = () => {
    if (!chosen) return
    setSaving(true)
    api
      .agentAddGroupAgent(room.groupId, room.teamId, chosen.sessionId)
      .then((result) => {
        room.setAgents(result.agents)
        onDone()
      })
      .catch((err: unknown) => toast.apiError(t('Could not add the agent'), err))
      .finally(() => setSaving(false))
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="px-1 pt-1 text-[11px] font-medium text-tertiary">{t('Add agents')}</div>
      <div className="max-h-[240px] overflow-y-auto">
        {candidates.length === 0 && (
          <div className="px-1 py-1.5 text-[12px] text-tertiary">
            {t('None of your agents can be added.')}
          </div>
        )}
        {candidates.map((conversation) => (
          <button
            key={conversation.sessionId}
            type="button"
            aria-pressed={chosen?.sessionId === conversation.sessionId}
            onClick={() => setChosen(conversation)}
            className={clsx(
              'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-zGray-800/40',
              chosen?.sessionId === conversation.sessionId && 'bg-zGray-800/60',
            )}
          >
            <AgentAvatar
              agentId={conversation.sessionId}
              avatar={conversation.avatar}
              provider={conversation.agentRuntime}
              size={24}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-main">
              {titleOf(conversation)}
            </span>
            {conversation.agentRuntime && (
              <span className="shrink-0 text-[11.5px] text-tertiary">
                {AGENT_PROVIDER[conversation.agentRuntime].label}
              </span>
            )}
          </button>
        ))}
      </div>
      {chosen && (
        <p className="px-1 text-[12px] leading-5 text-secondary">
          {t(
            '{agent} will read this group, and anyone who can open {agent} can see what it reads.',
            {
              agent: titleOf(chosen),
            },
          )}
        </p>
      )}
      <div className="flex justify-end gap-2 px-1 pb-1">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={saving}>
          {t('Back')}
        </Button>
        <Button variant="neutral" size="sm" onClick={add} disabled={saving || !chosen}>
          {t('Add')}
        </Button>
      </div>
    </div>
  )
}
