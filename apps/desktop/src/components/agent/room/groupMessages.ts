import { createContext } from 'react'

/** Set inside a group: its agents' posts are its messages, not events in a session. */
export type GroupMessages = { teamId: string; readable: (sessionId: string) => boolean }

export const GroupMessagesContext = createContext<GroupMessages | null>(null)
