import { faArrowLeft, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLayoutEffect, useRef } from 'react'

import { Button } from '../../components/ui/button'

import { fitColumn } from './fitColumn'
import { TALL_SCREENS } from './tallScreens'
import '../../styles/login-fonts.css'
import './tokens.css'
import './controls.css'

import type { Fit } from './fitColumn'
import type { ReactNode, Ref, RefObject } from 'react'

type Props = {
  headline: string
  /** The line under the headline. */
  lead?: ReactNode
  /** The fixed slot above the headline: the logo, a stepper, or nothing. */
  top?: ReactNode
  /** Shows Back in the top slot, before `top`. */
  onBack?: () => void
  /** Shows Log out at the bottom left. */
  onLogOut?: () => void
  /** Decorative art. It fills the scene region and may scale itself to fit; UI never does. */
  scene?: ReactNode
  /** For screens that keep scene art off the form (the face pyramid's wall). */
  columnRef?: Ref<HTMLDivElement>
  headlineRef?: Ref<HTMLHeadingElement>
  children: ReactNode
}

/**
 * The one onboarding layout: true-size UI in a fixed column at the welcome step's
 * position, the headline at the same height on every step, and an optional scene
 * region on the right. Sizes come from tokens.css.
 */
export function OnboardingShell({
  headline,
  lead,
  top,
  onBack,
  onLogOut,
  scene,
  columnRef,
  headlineRef,
  children,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const probesRef = useRef<HTMLDivElement>(null)

  useFitColumn(
    scrollRef,
    probesRef,
    TALL_SCREENS.findIndex((screen) => screen.headline === headline),
  )

  return (
    <div
      className="ob-shell"
      data-scene={scene ? '' : undefined}
      data-logout={onLogOut ? '' : undefined}
    >
      <div className="ob-drag titlebar-drag" />
      {scene && <div className="ob-scene">{scene}</div>}
      <div ref={scrollRef} className="ob-scroll">
        <div ref={columnRef} className="ob-main">
          <div className="ob-top">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="ob-link titlebar-no-drag"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Back
              </Button>
            )}
            {top}
          </div>
          <h1 ref={headlineRef} className="ob-headline">
            {headline}
          </h1>
          {lead && <p className="ob-lead">{lead}</p>}
          {children}
        </div>
        {/* The tallest screens' top and headline, measured to size this window's headline. */}
        <div ref={probesRef} className="ob-probe" aria-hidden>
          {TALL_SCREENS.map((screen) => (
            <div key={screen.headline} className="ob-main">
              <div className="ob-top" />
              <p className="ob-headline">{screen.headline}</p>
            </div>
          ))}
        </div>
      </div>
      {onLogOut && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogOut}
          className="ob-link ob-logout titlebar-no-drag"
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          Log out
        </Button>
      )}
    </div>
  )
}

/** Each tall screen's height below its headline, raised if the live screen outgrows it. */
const tallBelow = TALL_SCREENS.map((screen) => screen.belowHeadline)

/** A tall screen measures itself, so a change to it can't leave its headline too big. */
function measureTall(index: number, below: number) {
  if (import.meta.env.DEV && below > TALL_SCREENS[index].belowHeadline) {
    console.warn(
      `"${TALL_SCREENS[index].headline}" is ${String(below)} px below its headline now: update tallScreens.ts`,
    )
  }
  tallBelow[index] = Math.max(tallBelow[index], below)
}

/** Whether every tall screen fits the room at the levels set now (their probes' tops). */
function tallScreensFit(probes: HTMLElement[], room: number) {
  return probes.every((probe, i) => probe.offsetHeight + tallBelow[i] <= room)
}

/**
 * Fits the column to the window: the headline's size and place come from the window
 * alone (the tallest screens must fit), the spacing below it from this screen.
 */
function useFitColumn(
  scrollRef: RefObject<HTMLDivElement | null>,
  probesRef: RefObject<HTMLDivElement | null>,
  /** This screen's place in TALL_SCREENS, or -1. */
  tall: number,
) {
  useLayoutEffect(() => {
    const scroll = scrollRef.current
    const probes = [...(probesRef.current?.children ?? [])] as HTMLElement[]
    const main = scroll?.firstElementChild
    const shell = scroll?.parentElement

    if (!scroll || probes.length === 0 || !(main instanceof HTMLElement) || !shell) return
    const set = (fit: Fit) => {
      scroll.style.setProperty('--ob-fit-top', String(fit.top))
      scroll.style.setProperty('--ob-fit', String(fit.space))
    }
    const refit = () => {
      const style = getComputedStyle(shell)
      // Room for every screen: some show Log out, so take the bigger of the two bands.
      const band = Math.max(
        parseFloat(style.getPropertyValue('--ob-floor-band')) || 0,
        parseFloat(style.getPropertyValue('--ob-logout-band')) || 0,
      )
      const room = shell.clientHeight - band

      if (tall >= 0) {
        // Its body at floor spacing: the column minus the same top and headline.
        set({ top: 1, space: 0 })
        measureTall(tall, main.offsetHeight - probes[tall].offsetHeight)
      }
      set(
        fitColumn(
          (top) => {
            set({ top, space: 0 })

            return tallScreensFit(probes, room)
          },
          (fit) => {
            set(fit)

            return main.offsetHeight <= scroll.clientHeight
          },
        ),
      )
    }
    let frame = 0
    // Next frame, not inside the observer: resizing what it watches would loop.
    const schedule = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0
        refit()
      })
    }

    refit()
    // New content in the column (a card that loads after mount, an opened section)
    // refits before it paints. The window, fonts and images resize it next frame, as
    // does the floor band the scene sets on the shell.
    const content = new MutationObserver(refit)
    const resize = new ResizeObserver(schedule)
    const floor = new MutationObserver(schedule)

    content.observe(main, { childList: true, subtree: true, characterData: true })
    resize.observe(shell)
    resize.observe(main)
    floor.observe(shell, { attributes: true, attributeFilter: ['style'] })

    return () => {
      cancelAnimationFrame(frame)
      content.disconnect()
      resize.disconnect()
      floor.disconnect()
    }
  }, [scrollRef, probesRef, tall])
}
