import { useEffect, useRef, useState } from 'react'

import { BOT_AVATARS } from '../../lib/botAvatars'
import { buildScene, clampHeld, tileSize } from '../../lib/facePile/layout'
import { isActive, isSettled, STEP_S, step } from '../../lib/facePile/physics'
import { prefersReducedMotion } from '../../lib/motion'
import './face-pile.css'

import type { Body, World } from '../../lib/facePile/physics'
import type { RefObject } from 'react'

type Props = {
  /** The sign-in column and anything that runs wider than it. Faces stay off them (M4). */
  keepOut: RefObject<HTMLElement | null>[]
}

type Drag = { index: number; dx: number; dy: number; lastX: number; lastY: number; lastT: number }

const FALLING_SPEED = 260

function paint(world: World, tiles: (HTMLDivElement | null)[], tile: number): void {
  world.bodies.forEach((b, i) => {
    const el = tiles[i]

    if (!el) return
    el.style.transform = `translate(${String(b.x - tile / 2)}px, ${String(b.y - tile / 2)}px) rotate(${String(b.angle)}rad)`
    const falling = isActive(b, world.time) && !b.grounded && b.vy > FALLING_SPEED

    if ((el.dataset.falling === 'true') !== falling) el.dataset.falling = String(falling)
  })
}

/** The smallest box around the keep-out elements, in the pile's coordinates. */
function keepOutRect(els: HTMLElement[], to: HTMLElement) {
  const boxes = els.map((el) => el.getBoundingClientRect())
  const b = to.getBoundingClientRect()

  return {
    left: Math.min(...boxes.map((r) => r.left)) - b.left,
    top: Math.min(...boxes.map((r) => r.top)) - b.top,
    right: Math.max(...boxes.map((r) => r.right)) - b.left,
    bottom: Math.max(...boxes.map((r) => r.bottom)) - b.top,
  }
}

function floorPoints(world: World, height: number): string {
  const { y0, slope } = world.floor
  const w = world.width

  return `0,${String(y0)} ${String(w)},${String(y0 + slope * w)} ${String(w)},${String(height)} 0,${String(height)}`
}

/**
 * The sign-in screen's pile of bot faces: they drop in, can be picked up and thrown,
 * and never cover the form. The loop only runs while something moves (no idle CPU)
 * and stops while the window is hidden.
 */
export function FacePile({ keepOut }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tilesRef = useRef<(HTMLDivElement | null)[]>([])
  const worldRef = useRef<World | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const frameRef = useRef(0)
  const tileRef = useRef(0)
  const [scene, setScene] = useState<{ tile: number; floor: string } | null>(null)
  const [held, setHeld] = useState<number | null>(null)
  const [reduced] = useState(prefersReducedMotion)

  function stop() {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }

  function start() {
    if (frameRef.current || document.hidden || !worldRef.current) return
    let last = performance.now()
    let carry = 0
    const tick = (now: number) => {
      const world = worldRef.current

      if (!world) return
      carry = Math.min(carry + (now - last) / 1000, 0.1)
      last = now
      for (; carry >= STEP_S; carry -= STEP_S) step(world)
      paint(world, tilesRef.current, tileRef.current)
      frameRef.current = isSettled(world) && !dragRef.current ? 0 : requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const root = rootRef.current
    const els = keepOut.map((ref) => ref.current).filter((el) => el !== null)

    if (!root || els.length === 0) return
    // Only the first build drops the faces; a resize re-lays a settled pile.
    const rebuild = () => {
      stop()
      dragRef.current = null
      setHeld(null)
      const { clientWidth: width, clientHeight: height } = root
      const world = buildScene({
        width,
        height,
        form: keepOutRect(els, root),
        count: BOT_AVATARS.length,
        reducedMotion: reduced || worldRef.current !== null,
      })

      worldRef.current = world
      tileRef.current = tileSize(width, height)
      setScene({ tile: tileRef.current, floor: floorPoints(world, height) })
      paint(world, tilesRef.current, tileRef.current)
      start()
    }
    const observer = new ResizeObserver(rebuild)
    const onVisibility = () => (document.hidden ? stop() : start())

    // Measure the headline in its real font: in the fallback it runs far wider.
    let mounted = true

    void document.fonts.ready.then(() => mounted && observer.observe(root))
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mounted = false
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
    // start/stop only touch refs; the scene depends on the form and motion setting.
  }, [keepOut, reduced])

  function pointer(e: React.PointerEvent): { x: number; y: number } {
    const box = rootRef.current?.getBoundingClientRect()

    return { x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0) }
  }

  function grab(e: React.PointerEvent<HTMLDivElement>, index: number) {
    const body = worldRef.current?.bodies[index]

    if (reduced || !body || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointer(e)

    body.held = true
    Object.assign(body, { vx: 0, vy: 0, spin: 0 })
    dragRef.current = {
      index,
      dx: body.x - p.x,
      dy: body.y - p.y,
      lastX: p.x,
      lastY: p.y,
      lastT: e.timeStamp,
    }
    setHeld(index)
    start()
  }

  function move(e: React.PointerEvent) {
    const drag = dragRef.current
    const world = worldRef.current

    if (!drag || !world) return
    const body: Body = world.bodies[drag.index]
    const p = pointer(e)
    const dt = Math.max(1, e.timeStamp - drag.lastT) / 1000

    // Smoothed pointer velocity becomes the throw when the face is let go.
    body.vx = body.vx * 0.5 + ((p.x - drag.lastX) / dt) * 0.5
    body.vy = body.vy * 0.5 + ((p.y - drag.lastY) / dt) * 0.5
    Object.assign(drag, { lastX: p.x, lastY: p.y, lastT: e.timeStamp })
    clampHeld(world, body, p.x + drag.dx, p.y + drag.dy)
  }

  function release() {
    const drag = dragRef.current
    const body = drag && worldRef.current?.bodies[drag.index]

    dragRef.current = null
    setHeld(null)
    if (!body) return
    body.held = false
    body.grounded = false
    body.spin = body.vx / 120
    start()
  }

  return (
    <div ref={rootRef} className="face-pile" data-reduced={reduced} aria-hidden="true">
      <svg className="face-pile-floor" width="100%" height="100%">
        {scene && <polygon points={scene.floor} />}
      </svg>
      {BOT_AVATARS.map((file, i) => (
        <div
          key={file}
          ref={(el) => {
            tilesRef.current[i] = el
          }}
          className="face-tile titlebar-no-drag"
          data-held={held === i}
          style={{ width: scene?.tile, height: scene?.tile }}
          onPointerDown={(e) => grab(e, i)}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <span className="face-tile-lines" />
          <span className="face-tile-card">
            <img src={`/bot-avatars/${file}`} alt="" draggable={false} />
          </span>
          {held === i && <span className="face-tile-bubble">put me down!!</span>}
        </div>
      ))}
    </div>
  )
}
