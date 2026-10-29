import { t } from '../../../i18n'

import type { ReactNode } from 'react'

/** A quiet tag beside a name, styled like the agent tag. */
export function NameTag({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      className="shrink-0 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium leading-none text-tertiary"
      title={title}
    >
      {children}
    </span>
  )
}

/** Marks someone from outside the team who may only view the chat. */
export function GuestBadge() {
  return <NameTag title={t('Outside the team · view only')}>{t('Guest')}</NameTag>
}
