import { t } from '../../../i18n'
import { AGENT_PROVIDER } from '../../../types/runtime'

import type { AgentProvider } from '../../../types/runtime'

/** Marks a message an agent or bot wrote, so it never reads as a person's. */
export function AgentTag({ provider }: { provider?: AgentProvider }) {
  return (
    <span
      className="shrink-0 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium leading-none text-tertiary"
      title={
        provider
          ? t('Written by a {agent} agent', { agent: AGENT_PROVIDER[provider].label })
          : t('Written by an agent')
      }
    >
      {t('agent|tag')}
    </span>
  )
}
