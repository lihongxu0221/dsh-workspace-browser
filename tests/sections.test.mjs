import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assignWorkspace, canMoveSectionDown, canMoveSectionUp, createSection, createSectionsState,
  deleteSection, isSectionVisible, moveSection, moveSectionDown, moveSectionUp, normalizeSections,
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
  it('starts with a pinned section and a projects section', () => {
    const state = createSectionsState()
    assert.deepEqual(state.sections.map(section => section.id), ['pinned', 'default'])
  })

  it('keeps the projects section visible even when it has no members', () => {
    assert.equal(isSectionVisible('default', 0), true)
    assert.equal(isSectionVisible('pinned', 0), false)
    assert.equal(isSectionVisible('client', 0), false)
    assert.equal(isSectionVisible('client', 1), true)
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

  it('reorders custom sections while keeping pinned first', () => {
    let state = createSection(createSectionsState(), 'one', 'One')
    state = createSection(state, 'two', 'Two')
    const moved = moveSection(state, 'two', 'one')
    assert.deepEqual(moved.sections.map(section => section.id), ['pinned', 'two', 'one', 'default'])
  })

  it('keeps a moved projects section in place while normalizing', () => {
    let state = createSection(createSectionsState(), 'one', 'One')
    state = createSection(state, 'two', 'Two')
    const moved = moveSection(state, 'default', 'one')
    assert.deepEqual(moved.sections.map(section => section.id), ['pinned', 'default', 'one', 'two'])
    assert.deepEqual(normalizeSections(moved).sections.map(section => section.id), ['pinned', 'default', 'one', 'two'])
  })

  it('moves projects up and down around custom sections', () => {
    let state = createSection(createSectionsState(), 'one', 'One')
    state = createSection(state, 'two', 'Two')
    assert.equal(canMoveSectionUp(state, 'default'), true)
    assert.equal(canMoveSectionDown(state, 'default'), false)
    assert.deepEqual(moveSectionUp(state, 'default').sections.map(section => section.id), ['pinned', 'one', 'default', 'two'])
    const top = moveSection(state, 'default', 'one')
    assert.deepEqual(moveSectionDown(top, 'default').sections.map(section => section.id), ['pinned', 'one', 'default', 'two'])
    assert.equal(canMoveSectionUp(state, 'pinned'), false)
    assert.equal(canMoveSectionDown(state, 'pinned'), false)
  })

  it('never moves pinned or inserts another section before it', () => {
    const state = createSection(createSectionsState(), 'one', 'One')
    assert.deepEqual(moveSection(state, 'pinned', null), state)
    assert.deepEqual(moveSection(state, 'one', 'pinned'), state)
  })
})
