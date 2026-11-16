import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assignWorkspace, createSection, createSectionsState, deleteSection, moveSection, normalizeSections,
} from '../lib/types/client/sections/model.js'
import { mergeFolderLayer, parseFolderLayer } from '../lib/types/folder-layer.js'

describe('workspace section home-file round trip', () => {
  it('keeps the optional section layout in the folder layer', () => {
    const sections = createSection(createSectionsState(), 'client', 'Client')
    const parsed = parseFolderLayer(JSON.stringify({
      extraFoldersByWorkspace: {}, primaryByWorkspace: {}, sectionsEnabled: true, sections,
    }))
    assert.equal(parsed.sectionsEnabled, true)
    assert.equal(parsed.sections.sections.some(section => section.id === 'client'), true)
  })

  it('takes the home file only while this browser has no section state', () => {
    const sections = createSection(createSectionsState(), 'client', 'Client')
    const file = { extraFoldersByWorkspace: {}, primaryByWorkspace: {}, sectionsEnabled: true, sections }
    const empty = mergeFolderLayer({ extraFoldersByWorkspace: {}, primaryByWorkspace: {} }, file)
    assert.equal(empty.layer.sectionsEnabled, true)
    assert.equal(empty.layer.sections.sections.some(section => section.id === 'client'), true)
    const local = mergeFolderLayer({ extraFoldersByWorkspace: {}, primaryByWorkspace: {}, sectionsEnabled: false }, file)
    assert.equal(local.layer.sectionsEnabled, false)
  })
})

describe('workspace section model', () => {
  it('starts with a pinned section and a trailing projects section', () => {
    const state = createSectionsState()
    assert.deepEqual(state.sections.map(section => section.id), ['pinned', 'default'])
  })

  it('drops duplicate and unknown workspace ids without changing membership order', () => {
    const state = normalizeSections({
      sections: [
        { id: 'pinned', name: 'ignored', ids: ['a', 'a', 'gone'] },
        { id: 'default', name: '工作区', ids: ['b'] },
      ],
    }, ['a', 'b'])
    assert.deepEqual(state.sections.find(section => section.id === 'pinned').ids, ['a'])
    assert.equal(state.sections.at(-1).id, 'default')
  })

  it('moves a workspace between sections and removes its old membership', () => {
    const state = createSection(createSectionsState(), 'client', 'Client')
    const moved = assignWorkspace(assignWorkspace(state, 'w1', 'default'), 'w1', 'client')
    assert.deepEqual(moved.sections.find(section => section.id === 'client').ids, ['w1'])
    assert.deepEqual(moved.sections.find(section => section.id === 'default').ids, [])
  })

  it('merges members into projects when a custom section is deleted', () => {
    const state = assignWorkspace(createSection(createSectionsState(), 'client', 'Client'), 'w1', 'client')
    const removed = deleteSection(state, 'client')
    assert.equal(removed.sections.some(section => section.id === 'client'), false)
    assert.deepEqual(removed.sections.find(section => section.id === 'default').ids, ['w1'])
  })

  it('reorders custom sections but keeps projects last and pinned first', () => {
    let state = createSection(createSectionsState(), 'one', 'One')
    state = createSection(state, 'two', 'Two')
    const moved = moveSection(state, 'two', 'one')
    assert.deepEqual(moved.sections.map(section => section.id), ['pinned', 'two', 'one', 'default'])
  })
})