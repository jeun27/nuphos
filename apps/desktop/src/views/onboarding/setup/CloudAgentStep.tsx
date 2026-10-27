import { RadioGroup } from '@base-ui/react/radio-group'
import { Box, Server } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../../components/ui/button'
import { CLOUD_HEADLINE } from '../../../lib/onboarding/tallScreens'
import { useBoxAvailable } from '../../settings/useAgentDevices'

import { RadioCard, SetupScreen } from './SetupChrome'

export type CloudChoice = 'box' | 'self-hosted'

/** Step 2: why a cloud agent, then which kind — or, for non-admins, who adds one. */
export function CloudAgentStep({
  isAdmin,
  onSkip,
  onChoose,
}: {
  isAdmin: boolean
  onSkip: () => void
  onChoose: (choice: CloudChoice) => void
}) {
  const boxAvailable = useBoxAvailable()
  const [picked, setChoice] = useState<CloudChoice>('box')
  // Without Boxes on this backend, your own server is the way to a cloud agent.
  const choice = boxAvailable ? picked : 'self-hosted'

  return (
    <SetupScreen
      // One of the tallest screens: its headline sizes every screen's (tallScreens.ts).
      title={CLOUD_HEADLINE}
      subtitle="Local runtimes stop when this computer sleeps or Nuphos quits. A cloud runtime keeps running, so you can close your laptop and pick up where your agents left off on your phone."
      actions={
        <>
          {isAdmin && (
            <Button variant="secondary" size="lg" onClick={onSkip} className="ob-outline flex-1">
              Skip for now
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => (isAdmin ? onChoose(choice) : onSkip())}
            className="ob-primary flex-1"
          >
            Continue
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <h2 className="ob-label">Add a cloud runtime</h2>
        {isAdmin && (
          <RadioGroup
            value={choice}
            onValueChange={(value: CloudChoice) => setChoice(value)}
            className="space-y-2"
            aria-label="Cloud runtime type"
          >
            {boxAvailable && (
              <RadioCard
                value="box"
                selected={choice === 'box'}
                icon={<Box className="h-4 w-4" />}
                title="New computer"
                badge="Recommended"
                description="A cloud computer Nuphos runs for you, with Claude Code and Codex. Sign in with your own account."
              />
            )}
            <RadioCard
              value="self-hosted"
              selected={choice === 'self-hosted'}
              icon={<Server className="h-4 w-4" />}
              title="Self-hosted"
              description="Run it on your own account: Railway or any server with Docker Compose."
            />
          </RadioGroup>
        )}
        {!isAdmin && (
          <p className="ob-card leading-5 text-secondary">
            Cloud runtimes are added by workspace admins. Ask an admin of this workspace to add one;
            it shows up for you automatically.
          </p>
        )}
      </div>
    </SetupScreen>
  )
}
