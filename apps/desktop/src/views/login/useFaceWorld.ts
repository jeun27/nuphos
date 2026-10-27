import { useEffect, useRef, useState } from 'react'

import { bubbleOffset } from '../../lib/facePile/bubble'
import { clampHeld } from '../../lib/facePile/layout'
import { isActive, isSettled, STEP_S, step } from '../../lib/facePile/physics'

import type { Body, World } from '../../lib/facePile/physics'
import type { RefObject } from 'react'

type Drag = { index: number; dx: number; dy: number; lastX: number; lastY: number; lastT: number }

const FALLING_SPEED = 260

function paint(world: World, tiles: (HTMLDivElement | null)[], tile: number): void {
  world.bodies.forEach((b, i) => {
    const el = tiles[i]

    if (!el) return
    // Whole pixels keep the 2.5px borders and offset shadows crisp.
    el.style.transform = `translate(${String(Math.round(b.x - tile / 2))}px, ${String(Math.round(b.y - tile / 2))}px) rotate(${String(b.angle)}rad)`
    const falling = isActive(b, world.time) && !b.grounded && b.vy > FALLING_SPEED

    if ((el.dataset.falling === 'true') !== falling) el.dataset.falling = String(falling)
    if (b.held) placeBubble(el, b, tile, world.width)
  })
}

// Each bubble's text never changes, so its size is measured once: no layout reads per frame.
const bubbleSizes = new WeakMap<HTMLElement, { w: number; h: number }>()

/** Keeps a held face's bubble inside the window (shifted sideways, or below the face). */
function placeBubble(el: HTMLElement, b: Body, tile: number, width: number): void {
  const bubble = el.querySelector<HTMLElement>('.face-tile-bubble')

  if (!bubble) return
  let size = bubbleSizes.get(bubble)

  if (!size) {
    size = { w: bubble.offsetWidth, h: bubble.offsetHeight }
    bubbleSizes.set(bubble, size)
  }
  const { dx, below } = bubbleOffset({ x: b.x, y: b.y, tile, ...size, width })

  bubble.style.setProperty('--bubble-dx', `${String(dx)}px`)
  bubble.dataset.below = String(below)
}

/**
 * The face world's animation loop and drag/throw, shared by the onboarding
 * screens. The loop only runs while something moves (no idle CPU)
 * and pauses while the window is hidden. The caller builds the world.
 */
export function useFaceWorld(rootRef: RefObject<HTMLDivElement | null>) {
  const tilesRef = useRef<(HTMLDivElement | null)[]>([])
  const worldRef = useRef<World | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const frameRef = useRef(0)
  const tileRef = useRef(0)
  const [held, setHeld] = useState<number | null>(null)

  function stop() {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }

  /** Runs the loop until the world settles. `force` runs it at least once, after a refit moved walls. */
  function start(force = false) {
    const world = worldRef.current

    // Nothing to animate: a standing or settled world never starts the loop (no idle CPU).
    if (frameRef.current || document.hidden || !world) return
    if (!force && isSettled(world) && !dragRef.current) return
    // A moved wall: push faces out of it now. Faces at rest count as settled, so the
    // loop could otherwise stop on a first frame too short for a physics step.
    if (force) step(world)
    let last = performance.now()
    let carry = 0
    const tick = (now: number) => {
      const live = worldRef.current

      if (!live) return
      carry = Math.min(carry + (now - last) / 1000, 0.1)
      last = now
      for (; carry >= STEP_S; carry -= STEP_S) step(live)
      paint(live, tilesRef.current, tileRef.current)
      frameRef.current = isSettled(live) && !dragRef.current ? 0 : requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  /** Swaps in a freshly built world (mount, resize, restack) and draws it once. */
  function show(world: World, tile: number) {
    stop()
    dragRef.current = null
    setHeld(null)
    // A face held on the last screen is let go: nothing holds it here.
    for (const b of world.bodies) b.held = false
    worldRef.current = world
    tileRef.current = tile
    paint(world, tilesRef.current, tile)
  }

  useEffect(() => {
    const onVisibility = () => (document.hidden ? stop() : start())

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      // The world outlives this screen: never leave a face held by a pointer that is gone.
      for (const b of worldRef.current?.bodies ?? []) b.held = false
    }
  }, [])

  function pointer(e: React.PointerEvent): { x: number; y: number } {
    const box = rootRef.current?.getBoundingClientRect()

    return { x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0) }
  }

  function grab(e: React.PointerEvent<HTMLDivElement>, index: number) {
    const body = worldRef.current?.bodies[index]

    // A tile is a plain div: without this a click would blur the focused email field.
    e.preventDefault()
    if (!body) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointer(e)

    body.held = true
    // Picked up faces hang straight, so the bubble above them stays level.
    body.angle = Math.round(body.angle / (2 * Math.PI)) * 2 * Math.PI
    body.vx = 0
    body.vy = 0
    body.spin = 0
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

  return { tilesRef, worldRef, held, show, start, pointer, grab, move, release }
}
