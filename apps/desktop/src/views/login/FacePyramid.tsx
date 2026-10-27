import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { BOT_AVATARS } from '../../lib/botAvatars'
import { FACE_LINES } from '../../lib/facePile/faceLines'
import { FaceTile } from '../../lib/facePile/FaceTile'
import { keepPyramid, keptPyramid } from '../../lib/facePile/keptPyramid'
import { keepOutRect } from '../../lib/facePile/layout'
import {
  buildPyramid,
  explode,
  isStanding,
  PYRAMID_COUNT,
  pressAction,
  pyramidTile,
  refitPyramid,
  restack,
} from '../../lib/facePile/pyramid'
import { prefersReducedMotion } from '../../lib/motion'

import { useFaceWorld } from './useFaceWorld'

import './face-pyramid.css'

import type { PyramidInput } from '../../lib/facePile/pyramid'
import type { RefObject } from 'react'

type Props = {
  /** The sign-in column and anything wider than it (the headline). Faces stay off them (P5). */
  keepOut: RefObject<HTMLElement | null>[]
}

type Scene = {
  tile: number
  floorY: number
  /** The shell's --ob-floor-band for this layout. */
  floorBand: number
  width: number
  hintRight: number
  hintFits: boolean
  top: number
}
type Pop = { x: number; y: number; id: number }

const FACES = BOT_AVATARS.slice(0, PYRAMID_COUNT)

/** The last screen's layout, so the next screen can draw the kept pyramid on its first frame. */
let lastScene: Scene | null = null
/** Matches the pop animation in face-pyramid.css. */
const POP_MS = 300
const BITS = 8
/** Space kept between the column's scroll area and the pyramid's floor line. */
const FLOOR_GAP = 12
/** The hint pill's box (it sits left of the pyramid's base); it hides rather than crowd the form. */
const HINT = { width: 260, rise: 64, gap: 16 }

/** The floor's band, set on the shell so its column scrolls above the floor line. */
function setFloorBand(root: Element | null, band: number) {
  root?.closest<HTMLElement>('.ob-shell')?.style.setProperty('--ob-floor-band', `${String(band)}px`)
}

/** P3: a quick ring, flash and a few bits flying out from the click, CSS only. */
function BlastPop({ pop }: { pop: Pop }) {
  return (
    <span className="face-pyramid-pop" style={{ left: pop.x, top: pop.y }}>
      <span className="face-pyramid-pop-ring" />
      {Array.from({ length: BITS }, (_, i) => (
        <span
          key={i}
          className="face-pyramid-pop-bit"
          style={{ '--angle': `${String((360 / BITS) * i + 12)}deg` } as React.CSSProperties}
        />
      ))}
    </span>
  )
}

/**
 * The sign-in screen's 21 faces, stacked in a pyramid that waits for one click to
 * blow it apart (P1–P3); then drag, throw and Restack (P4). One pyramid serves both
 * the welcome and the email-code step, so it stays as the user left it between them.
 * Presses never take focus from the form (P5); reduced motion keeps it still (P6).
 * Memoised, so typing in the form never re-renders the 21 tiles.
 */
export const FacePyramid = memo(function FacePyramid({ keepOut }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<PyramidInput | null>(null)
  const faces = useFaceWorld(rootRef)
  const [scene, setScene] = useState<Scene | null>(() => (keptPyramid() ? lastScene : null))
  const [standing, setStanding] = useState(() => {
    const kept = keptPyramid()

    return kept ? isStanding(kept.world) : true
  })
  const [pop, setPop] = useState<Pop | null>(null)
  const [reduced] = useState(prefersReducedMotion)

  // Draw the pyramid the last screen left before this one paints, so it never blinks,
  // and give the shell its floor band first, so the column fits the right room.
  useLayoutEffect(() => {
    const kept = keptPyramid()

    if (!kept) return
    if (lastScene) setFloorBand(rootRef.current, lastScene.floorBand)
    faces.show(kept.world, kept.tile)
    // show only touches refs; this runs once, before the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const els = keepOut.map((ref) => ref.current).filter((el) => el !== null)

    if (!root || els.length === 0) return
    // A resize or a new screen refits the same pyramid to the new layout.
    const rebuild = () => {
      // A screen being replaced still observes for a moment, detached and 0x0: ignore it.
      if (!root.isConnected || !root.clientWidth || !root.clientHeight) return
      // The shell's scroll column ends where its scene region starts.
      const scroll = root.closest('.ob-shell')?.querySelector('.ob-scroll')
      const input = {
        width: root.clientWidth,
        height: root.clientHeight,
        form: keepOutRect(els, root),
        sceneLeft: scroll
          ? scroll.getBoundingClientRect().right - root.getBoundingClientRect().left
          : undefined,
      }
      // Where a standing pyramid sits: the hint and Restack line up with it.
      const layout = buildPyramid(input)
      const floorBand = input.height - layout.floor.y0 + FLOOR_GAP

      // The shell's column scrolls above the floor band, so the wall stops there too:
      // faces can still land on the floor under a short form.
      setFloorBand(root, floorBand)
      input.form.bottom = Math.min(input.form.bottom, input.height - floorBand)
      const r = layout.bodies[0].r

      const formBottom = input.form.bottom

      // No room for a face under the form: the wall runs past the floor, so its only
      // exits are sideways and a face resting there leaves it instead of sticking.
      if (layout.floor.y0 - formBottom < 2 * r) input.form.bottom = input.height + layout.floor.y0
      const kept = keptPyramid()
      const world = kept?.world ?? layout
      const tile = pyramidTile(input)

      if (kept) refitPyramid(world, input)
      keepPyramid({ world, tile })
      const pyramidLeft = layout.bodies[0].x - r

      inputRef.current = input
      faces.show(world, tile)
      setStanding(isStanding(world))
      // Faces left mid-air or inside the new form's wall settle into place: at least one
      // pass even when they were at rest, since the wall itself just moved.
      if (!isStanding(world)) faces.start(true)
      lastScene = {
        tile,
        floorY: layout.floor.y0,
        floorBand,
        width: input.width,
        hintRight: input.width - pyramidLeft + 12,
        hintFits:
          layout.floor.y0 - HINT.rise > formBottom + HINT.gap ||
          pyramidLeft - 12 - HINT.width > input.form.right + HINT.gap,
        top: layout.bodies[PYRAMID_COUNT - 1].y - r,
      }
      setScene(lastScene)
    }
    const observer = new ResizeObserver(rebuild)
    let mounted = true
    // Measure the headline in its real font, and decode every face before the first
    // frame so the explosion never stalls on an SVG.
    const decoded = Array.from(root.querySelectorAll('img'), (img) => img.decode())

    void Promise.allSettled([document.fonts.ready, ...decoded]).then(() => {
      if (!mounted) return
      observer.observe(root)
      // The shell fits its column to the window after a resize: follow the new form.
      for (const el of els) observer.observe(el)
    })

    return () => {
      mounted = false
      observer.disconnect()
    }
    // show only touches refs; the pyramid depends on the form's box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepOut])

  useEffect(() => {
    if (!pop) return
    const timer = window.setTimeout(() => setPop(null), POP_MS)

    return () => window.clearTimeout(timer)
  }, [pop])

  function press(e: React.PointerEvent<HTMLDivElement>, index: number) {
    const world = faces.worldRef.current

    if (!world) return
    const action = pressAction(e, { reducedMotion: reduced, standing: isStanding(world) })

    if (action === 'none') return
    if (action === 'drag') return faces.grab(e, index)
    const p = faces.pointer(e)

    explode(world, p.x, p.y)
    setStanding(false)
    setPop({ ...p, id: e.timeStamp })
    faces.start()
  }

  function rebuildStack(e: React.MouseEvent) {
    const world = faces.worldRef.current

    e.preventDefault()
    if (!world || !inputRef.current || !scene) return
    restack(world, inputRef.current)
    faces.show(world, scene.tile)
    setStanding(true)
  }

  return (
    <div ref={rootRef} className="face-pyramid" data-reduced={reduced} aria-hidden="true">
      {scene && (
        <svg className="face-pyramid-floor" width="100%" height="100%">
          <rect x="-4" y={scene.floorY} width={scene.width + 8} height="100%" />
        </svg>
      )}
      {FACES.map((file, i) => (
        <FaceTile
          key={file}
          ref={(el) => {
            faces.tilesRef.current[i] = el
          }}
          file={file}
          size={scene?.tile}
          held={faces.held === i}
          bubble={FACE_LINES[file]}
          onPointerDown={(e) => press(e, i)}
          onPointerMove={faces.move}
          onPointerUp={faces.release}
          onPointerCancel={faces.release}
        />
      ))}
      {scene?.hintFits && standing && !reduced && (
        <p
          className="face-pyramid-hint"
          style={{ right: scene.hintRight, top: scene.floorY - HINT.rise }}
        >
          one click knocks us all down →
        </p>
      )}
      {pop && <BlastPop key={pop.id} pop={pop} />}
      {scene && !standing && (
        <button
          type="button"
          tabIndex={-1}
          className="face-pyramid-restack titlebar-no-drag"
          style={{ right: 24, top: Math.max(56, scene.top) }}
          onPointerDown={(e) => e.preventDefault()}
          onClick={rebuildStack}
        >
          Restack
        </button>
      )}
    </div>
  )
})
