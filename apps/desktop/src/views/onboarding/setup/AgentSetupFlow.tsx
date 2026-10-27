import { useState } from 'react'

import { AGENT_PROVIDER } from '../../../types/runtime'

import { SetupStepContext, setupStep } from './agentSetup'
import { BoxCloudSetup } from './BoxCloudSetup'
import { CloudAgentStep } from './CloudAgentStep'
import { LocalAgentsStep } from './LocalAgentsStep'
import { SelfHostedSetup } from './SelfHostedSetup'
import { SetupComplete } from './SetupComplete'

import type { SetupScreen } from './agentSetup'
import type { ConnectedCloudAgent } from './SelfHostedSetup'
import type { AtlasTeam } from '../../../types'

/** Full-window agent setup after creating a workspace: local agents, then an optional cloud agent. */
export function AgentSetupFlow({ team, onFinish }: { team: AtlasTeam; onFinish: () => void }) {
  const [screen, setScreen] = useState<SetupScreen>('local')
  const [boxId, setBoxId] = useState<string | null>(null)
  const [cloudAgent, setCloudAgent] = useState<ConnectedCloudAgent | null>(null)
  const step = setupStep(screen)
  const connected = (agent: ConnectedCloudAgent) => {
    setCloudAgent(agent)
    setScreen('done')
  }

  return (
    // Full-window, above the app; each screen lays itself out in the onboarding shell.
    <div className="fixed inset-0 z-40 text-main">
      <SetupStepContext.Provider value={step}>
        {screen === 'local' && <LocalAgentsStep onContinue={() => setScreen('cloud')} />}
        {screen === 'cloud' && (
          <CloudAgentStep
            isAdmin={team.role === 'ADMINISTRATOR'}
            onSkip={onFinish}
            onChoose={setScreen}
          />
        )}
        {screen === 'box' && (
          <BoxCloudSetup
            teamId={team.id}
            deviceId={boxId}
            onCreated={setBoxId}
            onBack={() => setScreen('cloud')}
            onConnected={(instance) =>
              connected({
                provider: instance.provider,
                label: AGENT_PROVIDER[instance.provider].label,
              })
            }
          />
        )}
        {screen === 'self-hosted' && (
          <SelfHostedSetup team={team} onBack={() => setScreen('cloud')} onConnected={connected} />
        )}
        {screen === 'done' && <SetupComplete cloudAgent={cloudAgent} onFinish={onFinish} />}
      </SetupStepContext.Provider>
    </div>
  )
}
