import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveGroups, workspaceSourcePaths } from '../lib/types/client/tree.js'

const sid = (id) => id
const summary = (id, updatedAt, title = id) => ({
  id: sid(id), title, displayTitle: title || id, running: false, blank: false, updatedAt, retainedBy: {},
})
const list = (...items) => ({
  ids: items.map(item => item.id),
  byId: Object.fromEntries(items.map(item => [item.id, item])),
  phase: 'ready',
  projectionsBySession: {},
})
const workspace = (id, sessionIds, folders = []) => ({
  workspaceId: id,
  path: `D:/src/${id}`,
  title: id,
  sessionIds,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  folders,
})
const noRows = { pinnedSessionIds: [], archivedSessionIds: [], archivedFilter: 'default' }
const noStatus = new Map()

describe('workspace hover facts', () => {
  it('keeps the lead session title and the task count while the group is folded', () => {
    const [group] = deriveGroups(
      list(summary('older', 1, '核查项目'), summary('newer', 9, '后来的会话')),
      [workspace('lib', ['older', 'newer'], ['D:/src/lib-extra'])],
      noRows,
      noStatus,
      { expandedGroups: [] },
    )
    assert.equal(group.expanded, false)
    assert.deepEqual(group.sessions, [])
    assert.equal(group.sessionCount, 2)
    assert.equal(group.latestSessionTitle, '核查项目')
    assert.deepEqual(group.folders, ['D:/src/lib-extra'])
  })

  it('uses the pinned session as the lead title', () => {
    const [group] = deriveGroups(
      list(summary('plain', 30, '普通会话'), summary('pinned', 1, '置顶会话')),
      [workspace('lib', ['plain', 'pinned'])],
      { ...noRows, pinnedSessionIds: ['pinned'] },
      noStatus,
      { expandedGroups: ['lib'] },
    )
    assert.equal(group.latestSessionTitle, '置顶会话')
    assert.equal(group.sessions[0].id, 'pinned')
  })

  it('skips a blank session and keeps an empty title for an untitled one', () => {
    const blank = { ...summary('blank', 50, ''), blank: true }
    const untitled = summary('untitled', 1, '   ')
    const [group] = deriveGroups(
      list(blank, untitled),
      [workspace('lib', ['blank', 'untitled'])],
      noRows,
      noStatus,
      { expandedGroups: [] },
    )
    assert.equal(group.latestSessionTitle, '')
    assert.equal(group.sessionCount, 1)
  })

  it('omits the lead title when the workspace has no sessions', () => {
    const [group] = deriveGroups(
      list(),
      [workspace('lib', [])],
      noRows,
      noStatus,
      { expandedGroups: [] },
    )
    assert.equal(group.sessionCount, 0)
    assert.equal(group.latestSessionTitle, undefined)
  })
})

describe('workspaceSourcePaths', () => {
  it('lists the primary directory and extras, dropping blanks and repeats', () => {
    assert.deepEqual(workspaceSourcePaths('D:/src/Lib', [
      '',
      'D:\\src\\lib',
      'D:/src/Lib-extra',
    ]), ['D:/src/Lib', 'D:/src/Lib-extra'])
  })
})
