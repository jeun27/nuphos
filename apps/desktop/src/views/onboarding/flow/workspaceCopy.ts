import type { ChatStep } from './shared'

/**
 * The headline and lead each workspace screen shows in the onboarding column,
 * worded as the agent's greeting was in the chat version of this step.
 */
export function workspaceCopy({
  chatStep,
  workspaceMode,
  hasJoinOptions,
  firstName,
  workspaceName,
}: {
  chatStep: ChatStep
  workspaceMode: 'pick' | 'create'
  hasJoinOptions: boolean
  firstName: string
  workspaceName: string
}): { headline: string; lead: string } {
  const hi = `Hi ${firstName || 'there'}!`

  if (chatStep === 'creating') return { headline: 'Setting up your workspace', lead: workspaceName }
  if (workspaceMode === 'pick') {
    return {
      headline: 'Join a team',
      lead: `${hi} You have teams waiting for you — join the ones you want, or create your own workspace.`,
    }
  }

  return {
    headline: 'Create your workspace',
    // Leaving the team list for this screen: acknowledge the switch.
    lead: hasJoinOptions
      ? 'Sure — give your new workspace a name below.'
      : `${hi} Let's set up your first workspace.`,
  }
}
