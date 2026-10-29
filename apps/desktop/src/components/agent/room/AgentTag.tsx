import { t } from '../../../i18n'

/** Marks a message an agent wrote, so it never reads as a person's. */
export function AgentTag() {
  return (
    <span
      className="shrink-0 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium leading-none text-tertiary"
      title={t('Written by an agent')}
    >
      {t('agent|tag')}
    </span>
  )
}
