import { useEffect, useState } from 'react'

import { api } from '../../../api'
import { t } from '../../../i18n'
import { Button } from '../../ui/button'
import { toast } from '../../ui/toast'
import { TeammatePicker } from '../TeammatePicker'

import { outsideEmail } from './roomModel'

import type { Room } from './useRoom'
import type { TeamMember } from '../../../types'

/** Teammates join a group from here; someone outside the workspace is invited to it first. */
export function AddPeople({ room, onDone }: { room: Room; onDone: () => void }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [teamName, setTeamName] = useState('')
  const [picked, setPicked] = useState<TeamMember[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .atlasListTeamMembers(room.teamId)
      .then(setMembers)
      .catch((err: unknown) => toast.apiError(t('Failed to load team members'), err))
    api
      .atlasListTeams()
      .then((teams) => setTeamName(teams.find((team) => team.id === room.teamId)?.name ?? ''))
      .catch(() => setTeamName(''))
  }, [room.teamId])

  const here = new Set(room.people.map((person) => person.id))
  const invitable = (members ?? []).filter((member) => !here.has(member.id))
  const toggle = (member: TeamMember) =>
    setPicked((current) =>
      current.some((each) => each.id === member.id)
        ? current.filter((each) => each.id !== member.id)
        : [...current, member],
    )
  const add = () => {
    setSaving(true)
    api
      .agentInviteConversationParticipants(
        room.groupId,
        room.teamId,
        picked.map((member) => member.id),
        'reply',
      )
      .then(() => {
        room.reloadPeople()
        onDone()
      })
      .catch((err: unknown) => toast.apiError(t('Failed to add teammates'), err))
      .finally(() => setSaving(false))
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <TeammatePicker
        members={members}
        invitable={invitable}
        picked={picked}
        disabled={saving}
        onToggle={toggle}
        noMatch={(query) =>
          members && outsideEmail(query, members)
            ? t('Invite them to {team} first', { team: teamName || t('the workspace') })
            : null
        }
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={saving}>
          {t('Back')}
        </Button>
        <Button variant="neutral" size="sm" onClick={add} disabled={saving || picked.length === 0}>
          {t('Add')}
        </Button>
      </div>
    </div>
  )
}
