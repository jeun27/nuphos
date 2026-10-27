import './faceTile.css'

import type { BotAvatarFile } from '../botAvatars'
import type { ComponentPropsWithRef } from 'react'

type Props = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  file: BotAvatarFile
  /** Side of the square tile in px. */
  size?: number
  /** Picked up: the violet tile, plus the bubble when one is given. */
  held?: boolean
  bubble?: string
}

/**
 * One bot face on a square tile, shared by the onboarding screens. The parent
 * positions it (style.transform) and wires the pointer handlers.
 */
export function FaceTile({ file, size, held = false, bubble, className, style, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`face-tile titlebar-no-drag ${className ?? ''}`}
      data-held={held}
      style={{ width: size, height: size, ...style }}
    >
      <span className="face-tile-lines" />
      <span className="face-tile-card">
        <img src={`/bot-avatars/${file}`} alt="" draggable={false} />
      </span>
      {held && bubble && <span className="face-tile-bubble">{bubble}</span>}
    </div>
  )
}
