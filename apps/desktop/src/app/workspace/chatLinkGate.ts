import { isTeamId } from '../../lib/teamId.ts'

/**
 * Whether a chat link names a team this account is not in. Unknown until the
 * teams load (`null`), and a malformed team id falls back to the pane's team.
 */
export function chatLinkBlocked(
  teams: readonly { id: string }[] | null,
  teamId: string | undefined,
): teamId is string {
  return Boolean(teams) && isTeamId(teamId) && !teams!.some((team) => team.id === teamId)
}
