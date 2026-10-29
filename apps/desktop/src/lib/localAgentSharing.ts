import type { RuntimeInstance } from '../types/runtime'

/** A local agent runs on its owner's own computer (`local_<user>_<device>`). */
export function isLocalAgentRuntime(runtimeId: string | undefined): boolean {
  return runtimeId?.startsWith('local_') === true
}

/** Shown in the Share menu of a session on the owner's computer. A teammate's
 *  turn there waits for the owner's yes, or runs at once where the owner let the
 *  team steer the room; either way it runs as the owner. */
export const LOCAL_AGENT_SHARING_NOTE =
  'This agent runs on your computer’s local runtime. Teammates you share it with can send messages; each person’s first one waits for your OK, unless you let the team steer from the room bar. Their turns use your computer and your agent sign-in.'

/** The confirmation a move needs before it puts the session on a computer:
 *  from then on teammates' messages wait for the owner, and run as the owner. */
export function localAgentMoveWarning(
  target: Pick<RuntimeInstance, 'kind' | 'local'>,
): string | undefined {
  if (target.kind !== 'local') return undefined
  const shared = target.local?.shared

  if (shared)
    return `This runtime runs on a teammate’s own computer, which they share with you. It runs as them, and they can see what runs there.${
      shared.level === 'approve' ? ' They approve this agent before its first message runs.' : ''
    } Only you can send messages in this agent.`

  return 'This runtime runs on your computer. After the move, teammates’ messages in this agent wait for your OK unless you let the team steer it, and run with your agent sign-in.'
}
