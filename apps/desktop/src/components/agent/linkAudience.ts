import { t } from '../../i18n'

import type { GeneralAccess } from '../../api/agent-types'

/** Who the copied link opens for, said under it in the Share card. */
export function linkAudience(value: GeneralAccess, team: string) {
  if (value === 'reply') return t('Anyone in {team} with the link can view and reply', { team })
  if (value === 'view') return t('Anyone in {team} with the link can view', { team })

  return t('Only people invited can open this link')
}
