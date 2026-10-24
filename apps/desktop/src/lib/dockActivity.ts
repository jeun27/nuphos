import { onRuntimeStatesChange, runtimeStateOf } from './agentRuntimeStates.ts'
import { runtimeTurnActive } from './runtimeExecution.ts'

// The runtime-state store keeps every session any view has fetched, including
// teammates' sessions from team-wide search and sessions of a team left behind,
// and never prunes them. The Dock only counts the signed-in user's own chats in
// the current team, which the sidebar lists and refreshes every few seconds.
let mine: ReadonlySet<string> = new Set()
let changed = () => {
  /* Replaced while the Dock bridge runs. */
}

/** The user's own chats in the current team, as the sidebar last listed them. */
export function setDockSessions(sessionIds: Iterable<string>): void {
  mine = new Set(sessionIds)
  changed()
}

function anyOwnTurnActive(): boolean {
  for (const sessionId of mine) if (runtimeTurnActive(runtimeStateOf(sessionId))) return true

  return false
}

/** Tells the main process whether any of the user's chats is running, each time that changes. */
export function startDockActivity(send: (active: boolean) => void): () => void {
  let last = false
  const update = () => {
    const active = anyOwnTurnActive()

    if (active === last) return
    last = active
    send(active)
  }
  const off = onRuntimeStatesChange(update)

  changed = update
  update()

  return () => {
    off()
    changed = () => undefined
  }
}
