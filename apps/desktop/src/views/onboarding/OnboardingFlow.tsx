import { useCallback, useEffect, useRef, useState } from 'react'

import { OnboardingLogo } from '../../lib/onboarding/OnboardingLogo'
import { OnboardingShell } from '../../lib/onboarding/OnboardingShell'
import { FacePyramid } from '../login/FacePyramid'

import { deriveDefaultWorkspaceName, deriveFirstName } from './flow/shared'
import { useJoinOptionsSync, useWorkspaceActions } from './flow/use-join-options'
import { workspaceCopy } from './flow/workspaceCopy'
import { WorkspaceStep } from './flow/WorkspaceStep'
import { AgentSetupFlow } from './setup/AgentSetupFlow'

import type { ChatStep, OnboardingFlowProps } from './flow/shared'
import type { AtlasTeam, DiscoverableTeam, TeamInvitation } from '../../types'

export type { OnboardingFlowProps } from './flow/shared'

export function OnboardingFlow({
  user,
  dismissable,
  onClose,
  onCreateWorkspace,
  pendingInvitations,
  onAcceptInvitation,
  onJoinDiscoverableTeam,
  onLogout,
  onFinish,
}: OnboardingFlowProps) {
  // Set once a new workspace exists: its agent setup takes over the window. Joiners skip it.
  const [setupTeam, setSetupTeam] = useState<AtlasTeam | null>(null)
  const [chatStep, setChatStep] = useState<ChatStep>('workspace')
  const [workspaceName, setWorkspaceName] = useState(() => deriveDefaultWorkspaceName(user))
  const [creating, setCreating] = useState(false)
  // Invitations offered in the workspace step. Owned locally as a stable
  // snapshot: late arrivals merge in, and cards never vanish under the user
  // when the parent's pending list refetches.
  const [invitations, setInvitations] = useState<TeamInvitation[]>(pendingInvitations ?? [])
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null)
  // Workspaces advertising the user's email domain — offered next to the
  // invitations as another way into an existing team.
  const [discoverableTeams, setDiscoverableTeams] = useState<DiscoverableTeam[]>([])
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null)
  // The workspace step is two screens (Slack-style): `pick` lists the teams the
  // user can join (invitations + domain-discoverable) as the primary action;
  // `create` is the name-your-workspace composer. Pick only renders while join
  // options exist, so `create` is the natural state for a brand-new account.
  // Which one shows is derived below rather than stored — otherwise every
  // late-arriving invitation or discoverable team has to push it back to
  // `pick` from an effect. Set once the user explicitly chooses "create
  // instead", which is what keeps those late arrivals from yanking them back.
  const [explicitCreate, setExplicitCreate] = useState(false)
  // The pick screen is select-then-commit: cards only toggle a selection, and
  // Continue joins the whole set at once (accepted invitations + discoverable
  // joins). `joinedTeams` fills in during that commit — successful cards flip
  // to "Joined" one by one — and the first joined team becomes the context for
  // the app.
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [selectedTeamIds, setSelectedTeamIds] = useState<ReadonlySet<string>>(() => new Set())
  const [committing, setCommitting] = useState(false)
  const [joinedTeams, setJoinedTeams] = useState<{ id: string; name: string }[]>([])
  // The face pyramid keeps clear of the column and the headline.
  const columnRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const [keepOut] = useState(() => [columnRef, headlineRef])

  useJoinOptionsSync({
    onJoinDiscoverableTeam,
    pendingInvitations,
    setDiscoverableTeams,
    setInvitations,
  })

  const handleShowCreateWorkspace = useCallback(() => setExplicitCreate(true), [])

  const handleShowPickTeams = useCallback(() => setExplicitCreate(false), [])

  // Which screen the workspace step is actually showing: the team list only
  // exists while there is something to join, so an empty list falls back to the
  // create form. Shared by the stage prop and the Back control below.
  const hasJoinOptions = invitations.length > 0 || discoverableTeams.length > 0
  const effectiveWorkspaceMode = !explicitCreate && hasJoinOptions ? 'pick' : 'create'

  // Back returns from the create form to the team list — the only screen
  // there is to go back to.
  const canGoBack =
    chatStep === 'workspace' && effectiveWorkspaceMode === 'create' && hasJoinOptions

  const { handleCreate, toggleInvitationSelected, toggleTeamSelected, handleContinueSelected } =
    useWorkspaceActions({
      workspaceName,
      creating,
      setCreating,
      setChatStep,
      onCreateWorkspace,
      onAcceptInvitation,
      onJoinDiscoverableTeam,
      setActingInvitationId,
      invitations,
      discoverableTeams,
      selectedInvitationIds,
      setSelectedInvitationIds,
      selectedTeamIds,
      setSelectedTeamIds,
      committing,
      setCommitting,
      setJoinedTeams,
      setJoiningTeamId,
      joinedTeams,
      onCreated: setSetupTeam,
      onFinish,
    })

  // The visible titlebar and close button are intentionally gone. Dev-forced
  // sessions keep an invisible Esc escape hatch so debugging stays painless.
  useEffect(() => {
    if (!dismissable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  if (setupTeam) return <AgentSetupFlow team={setupTeam} onFinish={() => onFinish(setupTeam.id)} />

  const { headline, lead } = workspaceCopy({
    chatStep,
    workspaceMode: effectiveWorkspaceMode,
    hasJoinOptions,
    firstName: deriveFirstName(user),
    workspaceName,
  })

  return (
    // Full-window, above the app. The shell's title strip drags the window.
    <div className="fixed inset-0 z-40 text-main">
      <OnboardingShell
        headline={headline}
        lead={lead}
        top={<OnboardingLogo />}
        // Back returns from the create form to the team list, the only screen to go back to.
        onBack={canGoBack ? handleShowPickTeams : undefined}
        onLogOut={onLogout}
        scene={<FacePyramid keepOut={keepOut} />}
        columnRef={columnRef}
        headlineRef={headlineRef}
      >
        <WorkspaceStep
          chatStep={chatStep}
          workspaceMode={effectiveWorkspaceMode}
          workspaceName={workspaceName}
          onWorkspaceNameChange={setWorkspaceName}
          creating={creating}
          onCreate={() => void handleCreate()}
          invitations={invitations}
          actingInvitationId={actingInvitationId}
          discoverableTeams={discoverableTeams}
          joiningTeamId={joiningTeamId}
          selectedInvitationIds={selectedInvitationIds}
          selectedTeamIds={selectedTeamIds}
          committing={committing}
          onToggleInvitation={toggleInvitationSelected}
          onToggleTeam={toggleTeamSelected}
          onShowCreateWorkspace={handleShowCreateWorkspace}
          joinedTeams={joinedTeams}
          onContinueJoined={() => void handleContinueSelected()}
        />
      </OnboardingShell>
    </div>
  )
}
