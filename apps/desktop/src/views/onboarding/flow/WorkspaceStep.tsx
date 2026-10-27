import { ArrowRight, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { InvitationList } from '../../../components/InvitationList'
import { Button } from '../../../components/ui/button'

import type { ChatStep } from './shared'
import type { DiscoverableTeam, TeamInvitation } from '../../../types'

type Props = {
  chatStep: ChatStep
  workspaceMode: 'pick' | 'create'
  workspaceName: string
  onWorkspaceNameChange: (v: string) => void
  creating: boolean
  onCreate: () => void
  invitations: TeamInvitation[]
  actingInvitationId: string | null
  discoverableTeams: DiscoverableTeam[]
  joiningTeamId: string | null
  selectedInvitationIds: ReadonlySet<string>
  selectedTeamIds: ReadonlySet<string>
  committing: boolean
  onToggleInvitation: (invitation: TeamInvitation) => void
  onToggleTeam: (team: DiscoverableTeam) => void
  onShowCreateWorkspace: () => void
  joinedTeams: { id: string; name: string }[]
  onContinueJoined: () => void
}

/**
 * The workspace step's form in the onboarding column: name a new workspace, pick
 * teams to join, or wait while the new workspace is set up.
 */
export function WorkspaceStep(props: Props) {
  const { chatStep, workspaceMode, workspaceName, creating, onCreate } = props
  const canCreate = workspaceName.trim().length > 0 && !creating
  // Land the caret in the name field whenever the create screen shows.
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (chatStep === 'workspace' && workspaceMode === 'create') inputRef.current?.focus()
  }, [chatStep, workspaceMode])

  if (chatStep === 'creating') {
    return (
      <p className="ob-helper flex items-center gap-2" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Setting up your workspace…
      </p>
    )
  }
  if (workspaceMode === 'create') {
    return (
      <div className="ob-form">
        <input
          ref={inputRef}
          type="text"
          required
          maxLength={80}
          value={workspaceName}
          onChange={(e) => props.onWorkspaceNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onCreate()
            }
          }}
          placeholder="Name your workspace…"
          aria-label="Workspace name"
          className="ob-input titlebar-no-drag placeholder:text-tertiary focus:border-zViolet-accent"
        />
        <Button
          size="lg"
          onClick={onCreate}
          disabled={!canCreate}
          className="ob-primary group w-full titlebar-no-drag"
        >
          <span>Create workspace</span>
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          )}
        </Button>
      </div>
    )
  }

  return <PickTeams {...props} />
}

function PickTeams(props: Props) {
  const { selectedInvitationIds, selectedTeamIds, committing, joinedTeams } = props
  const selectedCount = selectedInvitationIds.size + selectedTeamIds.size

  return (
    <div className="ob-form">
      <div className="max-h-[42vh] space-y-2 overflow-y-auto scrollbar-thin titlebar-no-drag">
        <InvitationList
          invitations={props.invitations}
          discoverableTeams={props.discoverableTeams}
          joinedTeamIds={new Set(joinedTeams.map((team) => team.id))}
          actingInvitationId={props.actingInvitationId}
          joiningTeamId={props.joiningTeamId}
          selection={{
            invitationIds: selectedInvitationIds,
            teamIds: selectedTeamIds,
            committing,
            onToggleInvitation: props.onToggleInvitation,
            onToggleTeam: props.onToggleTeam,
          }}
        />
      </div>
      <Button
        size="lg"
        onClick={props.onContinueJoined}
        disabled={committing || (selectedCount === 0 && joinedTeams.length === 0)}
        className="ob-primary group w-full titlebar-no-drag"
      >
        <span>Continue</span>
        {committing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        )}
      </Button>
      <div className="flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-zGray-800" />
        <span className="ob-helper">or</span>
        <div className="h-px flex-1 bg-zGray-800" />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onShowCreateWorkspace}
        className="ob-link self-start titlebar-no-drag"
      >
        Create a new workspace instead
      </Button>
    </div>
  )
}
