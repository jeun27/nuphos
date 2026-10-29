import { useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { Modal } from '../../Modal'
import { Button } from '../../ui/button'
import { toast } from '../../ui/toast'

/** Names a new group; it starts private, with the viewer as its owner. */
export function NewGroupDialog({
  teamId,
  onClose,
  onCreated,
}: {
  teamId: string
  onClose: () => void
  onCreated: (sessionId: string) => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const create = () => {
    const name = title.trim()

    if (!name || saving) return
    setSaving(true)
    api
      .agentCreateGroup(teamId, name)
      .then(({ sessionId }) => {
        onClose()
        onCreated(sessionId)
      })
      .catch((err: unknown) => {
        setSaving(false)
        toast.apiError(t('Could not create the group'), err)
      })
  }

  return (
    <Modal
      open
      title={t('New group')}
      description={t('People and agents talk here. Only those you add can see it.')}
      appearance="prompt"
      width={420}
      onClose={onClose}
    >
      <form
        className="titlebar-no-drag"
        onSubmit={(event) => {
          event.preventDefault()
          create()
        }}
      >
        <div className="px-5 pt-1 pb-5">
          <input
            aria-label={t('Group name')}
            placeholder={t('Group name')}
            autoFocus
            maxLength={200}
            value={title}
            disabled={saving}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
              if (event.key === 'Escape' && !saving) onClose()
            }}
            className="w-full rounded-md border border-main bg-main px-3 py-2 text-[13px] text-main outline-none focus:border-zViolet-accent"
          />
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <Button
            type="button"
            variant="secondary"
            className="h-9 min-w-[72px] !rounded-lg"
            disabled={saving}
            onClick={onClose}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="neutral"
            className="h-9 min-w-[72px] !rounded-lg"
            disabled={saving || !title.trim()}
          >
            {saving ? t('Creating…') : t('Create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
