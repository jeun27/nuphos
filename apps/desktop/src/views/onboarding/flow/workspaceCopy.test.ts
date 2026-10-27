import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { workspaceCopy } from './workspaceCopy.ts'

const base = {
  chatStep: 'workspace' as const,
  hasJoinOptions: false,
  firstName: 'Sam',
  workspaceName: "Sam's Workspace",
}

describe('workspaceCopy', () => {
  it('asks a brand-new account to create its first workspace', () => {
    assert.deepEqual(workspaceCopy({ ...base, workspaceMode: 'create' }), {
      headline: 'Create your workspace',
      lead: "Hi Sam! Let's set up your first workspace.",
    })
  })

  it('offers waiting teams on the pick screen', () => {
    const copy = workspaceCopy({ ...base, workspaceMode: 'pick', hasJoinOptions: true })

    assert.equal(copy.headline, 'Join a team')
    assert.match(copy.lead, /^Hi Sam! You have teams waiting for you/)
  })

  it('acknowledges leaving the team list for the create screen', () => {
    const copy = workspaceCopy({ ...base, workspaceMode: 'create', hasJoinOptions: true })

    assert.equal(copy.lead, 'Sure — give your new workspace a name below.')
  })

  it('names the workspace being set up', () => {
    assert.deepEqual(workspaceCopy({ ...base, workspaceMode: 'create', chatStep: 'creating' }), {
      headline: 'Setting up your workspace',
      lead: "Sam's Workspace",
    })
  })

  it('greets "there" when the user has no usable name', () => {
    assert.match(
      workspaceCopy({ ...base, workspaceMode: 'create', firstName: '' }).lead,
      /^Hi there!/,
    )
  })
})
