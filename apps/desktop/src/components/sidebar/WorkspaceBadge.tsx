import { useBadgeReading, useBadgeStat } from '../../hooks/useBadgeStat'
import { useCharacterPick } from '../../hooks/useProfileCharacter'

import { CharacterRing } from './CharacterRing'

import type { AgentConversation } from '../../api'
import type { UserInfo } from '../../types'
import type { ReactNode } from 'react'

/** Stretches an icon (a logo image or initials tile) to fill a circle, centred and cropped. */
export function CircleFill({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-full w-full items-center justify-center [&>*]:!h-full [&>*]:!w-full [&>*]:!rounded-none [&_img]:object-cover [&>svg]:!h-full [&>svg]:!w-full">
      {children}
    </span>
  )
}

/**
 * The workspace icon in the sidebar's workspace row, in a thin ring with a badge for the
 * one stat the person picked in Team settings › General, cropped to a circle to match the
 * ring. It only displays: clicking it opens the workspace menu. With no stat picked to
 * show, it is the plain square icon, as before.
 */
export function WorkspaceBadge({
  user,
  icon,
  ringIcon,
  teamId,
  sessions = [],
  onUserUpdated,
}: {
  user: UserInfo
  /** The workspace icon exactly as the switcher shows it: a logo or initials. */
  icon: ReactNode
  /** The same icon unsized, to fill the ring as a circle. */
  ringIcon: ReactNode
  teamId?: string
  /** This workspace's sessions, as the sidebar lists them. */
  sessions?: readonly AgentConversation[]
  onUserUpdated: (user: UserInfo) => void
}) {
  // Both also send up a pick kept on this computer once the server can take it; the
  // character itself shows in the account row at the bottom of the sidebar.
  const { stat } = useBadgeStat(user, onUserUpdated)

  useCharacterPick(user, onUserUpdated)
  const reading = useBadgeReading(stat, teamId, sessions)

  if (stat === 'none') return <>{icon}</>

  return (
    <span className="relative flex-none" title={reading.summary}>
      <CharacterRing
        size={26}
        stroke={2}
        fallback={<CircleFill>{ringIcon}</CircleFill>}
        fraction={reading.fraction}
      />
      {reading.badge && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-zViolet-500 px-[3px] text-[9px] font-bold tabular-nums leading-none text-white"
        >
          {reading.badge}
        </span>
      )}
    </span>
  )
}
