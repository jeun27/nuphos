import { useEffect, useRef } from 'react'

const OPEN_RUNTIME_MENU = 'nuphos:open-runtime-menu'

/** Asks the open composer of `sessionId` to show its runtime list, where a move starts. */
export function requestRuntimeMenu(sessionId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_RUNTIME_MENU, { detail: sessionId }))
}

/** Opens a conversation's runtime list when the room asks for it. */
export function useRuntimeMenuRequest(sessionId: string | undefined, open: () => void) {
  const latest = useRef(open)

  useEffect(() => {
    latest.current = open
  })
  useEffect(() => {
    if (!sessionId) return
    const onRequest = (event: Event) => {
      if ((event as CustomEvent<string>).detail === sessionId) latest.current()
    }

    window.addEventListener(OPEN_RUNTIME_MENU, onRequest)

    return () => window.removeEventListener(OPEN_RUNTIME_MENU, onRequest)
  }, [sessionId])
}
