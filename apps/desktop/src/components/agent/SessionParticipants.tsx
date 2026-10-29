import { Popover } from '@base-ui/react/popover'
import clsx from 'clsx'
import { Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '../../api'
import { t } from '../../i18n'
import { LOCAL_AGENT_SHARING_NOTE } from '../../lib/localAgentSharing'
import { toast } from '../ui/toast'

import { linkAudience } from './linkAudience'
import { publishRoomTeam } from './room/useRoom'
import { agentSessionUrl } from './sessionUrl'
import { GeneralAccessRow } from './ShareAccess'
import {
  AddedReceipt,
  ParticipantList,
  ShareButtonFace,
  ShareLink,
  TitlebarDragSuspender,
} from './ShareCard'
import { firstAdminName } from './shareInvite'
import { SharePendingRows } from './SharePendingRows'
import { ShareWorkspace } from './ShareWorkspace'
import { AddPickedRow, TeammatePicker } from './TeammatePicker'
import { useShareAccess } from './useShareAccess'

import type { ParticipantRole } from '../../api/agent-types'
import type { AtlasTeam, TeamMember } from '../../types'

/**
 * The session's people, and the Share card that decides who else may open it:
 * a team-wide general access plus a role for each invited person, resolved the
 * way Notion does — the broader grant wins. Only the owner changes any of it.
 */
export function SessionParticipants({
  sessionId,
  teamId,
  title,
  currentUserId,
  team,
  canManage,
  warnLocalAgent,
  compact,
  onOpenTeamSettings,
}: {
  sessionId: string
  teamId: string
  title: string
  currentUserId: string
  team?: Pick<AtlasTeam, 'name' | 'role'> | null
  /** The viewer owns this session, so they decide who has access. */
  canManage: boolean
  /** The viewer owns this session and it runs on their own computer's Local Agent. */
  warnLocalAgent: boolean
  /** A narrow pane header: one avatar and no "Share" label. */
  compact?: boolean
  /** Opens Settings → Members; offered to team admins. */
  onOpenTeamSettings?: () => void
}) {
  const access = useShareAccess(sessionId, teamId)
  const { participants, generalAccess, pending } = access
  const [inviteRole, setInviteRole] = useState<ParticipantRole>('reply')
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [picked, setPicked] = useState<TeamMember[]>([])
  // Set once people are added: the card shows its receipt instead of the picker.
  const [added, setAdded] = useState<TeamMember[] | null>(null)
  const teamName = team?.name ?? t('the team')
  const isAdmin = team?.role === 'ADMINISTRATOR'

  useEffect(() => publishRoomTeam(teamId, { name: teamName, isAdmin }), [teamId, teamName, isAdmin])

  const onOpenChange = (open: boolean) => {
    if (!open) return
    setPicked([])
    setAdded(null)
    if (members) return
    api
      .atlasListTeamMembers(teamId)
      .then(setMembers)
      .catch((err: unknown) => toast.apiError(t('Failed to load team members'), err))
  }

  const togglePicked = (member: TeamMember) =>
    setPicked((current) =>
      current.some((m) => m.id === member.id)
        ? current.filter((m) => m.id !== member.id)
        : [...current, member],
    )

  const addMembers = (people: TeamMember[]) =>
    void access
      .add(
        people.map((member) => member.id),
        inviteRole,
      )
      .then((ok) => {
        if (!ok) return
        setAdded(people)
        setPicked([])
      })

  // Undo takes the people back out and returns them to the picker, so a wrong
  // pick is one click from fixed.
  const undo = () => {
    if (!added) return
    void access.undo(added.map((member) => member.id)).then((ok) => {
      if (!ok) return
      setPicked(added)
      setAdded(null)
    })
  }

  const joined = new Set(participants.map((participant) => participant.id))
  const invitable = (members ?? []).filter((member) => !joined.has(member.id))
  const adminName = firstAdminName(members, currentUserId)
  const emailInvite =
    isAdmin && canManage ? { teamId, teamName, sessionId, role: inviteRole } : undefined

  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger
        className={clsx(
          'titlebar-no-drag flex h-7 flex-shrink-0 items-center gap-2 rounded-md px-1.5',
          'text-[12px] font-medium text-secondary transition-colors',
          'data-[popup-open]:bg-zGray-800/60 data-[popup-open]:text-main hover:bg-zGray-800/60 hover:text-main',
        )}
        title={t('Share this agent with a teammate')}
      >
        <ShareButtonFace participants={participants} compact={compact} />
      </Popover.Trigger>
      <Popover.Portal>
        <TitlebarDragSuspender />
        <Popover.Positioner align="end" sideOffset={6} collisionPadding={12} className="z-[1000]">
          <Popover.Popup
            className={(state) =>
              clsx(
                't-dropdown w-[320px] rounded-xl border border-zGray-800/60 bg-main shadow-[0_10px_28px_-6px_rgba(0,0,0,0.6)] outline-none',
                state.open && 'is-open',
                state.transitionStatus === 'ending' && 'is-closing',
              )
            }
            style={{ transformOrigin: 'top right' }}
          >
            {added ? (
              <AddedReceipt
                added={added}
                detail={
                  inviteRole === 'view' && generalAccess !== 'reply'
                    ? t('They can view this agent')
                    : t('They can view and reply')
                }
                undoing={pending === 'undo'}
                onUndo={undo}
              />
            ) : (
              <div className="t-share-in flex flex-col gap-3 p-3">
                <div className="flex items-center gap-2 px-1">
                  <Popover.Title className="min-w-0 flex-1 truncate text-[13px] font-medium text-main">
                    {t('Share “{title}”', { title })}
                  </Popover.Title>
                  <Popover.Close
                    className="rounded p-0.5 text-tertiary hover:bg-zGray-800/60 hover:text-main"
                    aria-label={t('Close')}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </Popover.Close>
                </div>
                {(emailInvite !== undefined || !isAdmin) && (
                  <ShareWorkspace
                    context={emailInvite}
                    teamName={teamName}
                    adminName={adminName}
                    members={members}
                    participantIds={joined}
                    onAddMember={(member) => addMembers([member])}
                    onOpenTeamSettings={isAdmin ? onOpenTeamSettings : undefined}
                  />
                )}
                <ShareLink
                  url={agentSessionUrl(teamId, sessionId)}
                  note={linkAudience(generalAccess, teamName)}
                >
                  <GeneralAccessRow
                    value={generalAccess}
                    canManage={canManage && pending === null}
                    onChange={access.changeGeneralAccess}
                  />
                </ShareLink>
                {warnLocalAgent && (
                  <div className="flex gap-2 px-1 text-[12px] leading-snug text-tertiary">
                    <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    {LOCAL_AGENT_SHARING_NOTE}
                  </div>
                )}
                <ParticipantList
                  participants={participants}
                  currentUserId={currentUserId}
                  generalAccess={generalAccess}
                  canManage={canManage}
                  pending={pending}
                  onRoleChange={access.changeRole}
                  onRemove={access.remove}
                >
                  <SharePendingRows sessionId={sessionId} teamId={teamId} isAdmin={isAdmin} />
                </ParticipantList>
                {canManage ? (
                  <>
                    <TeammatePicker
                      members={members}
                      invitable={invitable}
                      picked={picked}
                      disabled={pending !== null}
                      onToggle={togglePicked}
                      teamName={teamName}
                      adminName={adminName}
                      emailInvite={emailInvite}
                    />
                    <AddPickedRow
                      role={inviteRole}
                      onRoleChange={setInviteRole}
                      count={picked.length}
                      pending={pending}
                      onAdd={() => addMembers(picked)}
                    />
                  </>
                ) : (
                  <div className="px-1 text-[12px] text-tertiary">
                    {t('Only the owner can change who has access.')}
                  </div>
                )}
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
