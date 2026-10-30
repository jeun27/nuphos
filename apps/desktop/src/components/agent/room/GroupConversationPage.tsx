import { useMemo } from 'react'

import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { t } from '../../../i18n'
import { toAbsoluteAtlasUrl } from '../../../lib/webBaseUrl'
import { Composer } from '../panel/Composer'
import { composerDraftKey } from '../panel/composerDrafts'
import { Conversation } from '../panel/Conversation'

import { GroupMessagesContext } from './groupMessages'
import { RoomBar } from './RoomBar'
import { agentsPaused } from './roomModel'
import { useRoom } from './useRoom'

import type { PanelViewCtx } from '../panel/ctx'
import type { Tab } from '../panel/model'

/**
 * A group open in the chat pane: who is here, the shared transcript, and a
 * composer that posts to the group. No agent runs here, so there is no
 * stop, no runtime, and no waiting row for agents that stay quiet.
 */
export function GroupConversationPage({ c, tab }: { c: PanelViewCtx; tab: Tab }) {
  const teamId = c.teamId ?? ''
  const currentUserId = useCurrentUser()?.id ?? ''
  const room = useRoom(tab.sessionId, teamId, tab.agentSessionIds, !tab.foreign)
  const { listed } = room
  const group = useMemo(() => {
    const readable = new Set(listed.map((conversation) => conversation.sessionId))

    return { teamId, readable: (sessionId: string) => readable.has(sessionId) }
  }, [listed, teamId])
  const openAgent = (sessionId: string) =>
    c.onOpenNuphosLink?.(toAbsoluteAtlasUrl(`/teams/${teamId}/agent/${sessionId}`))

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <RoomBar room={room} currentUserId={currentUserId} onOpenAgent={openAgent} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <GroupMessagesContext.Provider value={group}>
          <Conversation
            tab={tab}
            visible={c.visible && c.showingConversationPage}
            teamId={teamId}
            isTeamAdmin={c.isTeamAdmin}
            currentUrl={c.url}
            sidebar={c.isSidebarMode}
            onLoadEarlier={() => void c.loadEarlierMessages(tab.id)}
            onOpenNuphosLink={c.onOpenNuphosLink}
          />
        </GroupMessagesContext.Provider>
      </div>
      <div className="z-10">
        {agentsPaused(tab.agentTurns, room.agents.length) && (
          <p className="mx-auto w-full max-w-[760px] px-6 pb-1.5 text-[12px] text-tertiary">
            {t('Agents are paused until someone posts.')}
          </p>
        )}
        <Composer
          onSend={(text, filePaths) => void c.sendInActive(text, filePaths)}
          onStop={c.stopActive}
          autoFocus={c.focusComposerOnOpen}
          readOnly={tab.readOnly}
          sidebar={c.isSidebarMode}
          dropRegisterRef={c.conversationDropRef}
          draftKey={composerDraftKey(teamId, tab.sessionId)}
          mentionScope={teamId ? { teamId } : undefined}
        />
      </div>
    </div>
  )
}
