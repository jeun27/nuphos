import { NewGroupAction } from './NewGroupAction'

import type { Section } from './types'

/** Adds the New group action to the New agent row, wherever the sidebar lists it. */
export function withNewGroup(
  sections: readonly Section[],
  teamId: string,
  onOpen: (key: string) => void,
): Section[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.key === 'team.agent'
        ? { ...item, actions: <NewGroupAction teamId={teamId} onOpen={onOpen} /> }
        : item,
    ),
  }))
}
