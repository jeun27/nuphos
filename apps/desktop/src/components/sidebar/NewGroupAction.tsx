import { Users } from 'lucide-react'
import { useState } from 'react'

import { t } from '../../i18n'
import { NewGroupDialog } from '../agent/room/NewGroupDialog'

import type { SyntheticEvent } from 'react'

const fence = (event: SyntheticEvent) => event.stopPropagation()

/** Beside New agent: start a group, then open it. */
export function NewGroupAction({
  teamId,
  onOpen,
}: {
  teamId: string
  onOpen: (key: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    // The row navigates on press; nothing in here, the dialog included, may reach it.
    <span className="contents" onClick={fence} onKeyDown={fence} onPointerDown={fence}>
      <span
        role="button"
        tabIndex={-1}
        aria-label={t('New group')}
        title={t('New group')}
        onClick={() => setOpen(true)}
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-tertiary hover:bg-[var(--sidebar-overlay-hover)] hover:text-main"
      >
        <Users className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      {open && (
        <NewGroupDialog
          teamId={teamId}
          onClose={() => setOpen(false)}
          onCreated={(sessionId) => onOpen(`agent-session:${sessionId}`)}
        />
      )}
    </span>
  )
}
