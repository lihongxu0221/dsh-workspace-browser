import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  containsDirectory,
  selectWorkspace,
  sourceFoldersContext,
  workspaceSourceFolders,
} from '../lib/types/session-folders.js'

const layer = (extraFoldersByWorkspace, primaryByWorkspace = {}) => ({ extraFoldersByWorkspace, primaryByWorkspace })
const workspace = (id, path, sessionIds = [], folders) => ({ id, path, sessionIds, ...(folders === undefined ? {} : { folders }) })
const session = (id, cwd) => (cwd === undefined ? { id } : { id, header: { cwd } })

describe('workspace source folders', () => {
  it('lists the primary first and the plugin folders after it', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'])]
    assert.deepEqual(workspaceSourceFolders(layer({ w1: ['D:\\shared', 'D:\\other'] }), workspaces[0]), [
      'E:/proj',
      'D:\\shared',
      'D:\\other',
    ])
  })

  it('prefers a promoted primary and does not repeat it as an extra', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'])]
    const folders = workspaceSourceFolders(
      layer({ w1: ['d:/promoted', 'D:\\shared'] }, { w1: 'D:\\Promoted' }),
      workspaces[0],
    )
    assert.deepEqual(folders, ['D:\\Promoted', 'D:\\shared'])
  })

  it('merges the folders a newer host projects onto the workspace itself', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'], ['D:\\host', 'd:/shared'])]
    const folders = workspaceSourceFolders(layer({ w1: ['D:\\shared', 'D:\\plugin'] }), workspaces[0])
    assert.deepEqual(folders, ['E:/proj', 'D:\\host', 'd:/shared', 'D:\\plugin'])
  })
})

describe('session workspace selection', () => {
  it('follows the registry membership', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1']), workspace('w2', 'E:/other', [])]
    assert.equal(selectWorkspace(layer({}), workspaces, session('s1', 'E:/elsewhere'))?.id, 'w1')
  })

  it('matches a session the host never attached by its cwd inside a plugin folder', () => {
    const workspaces = [workspace('w1', 'E:/proj', []), workspace('w2', 'E:/other', [])]
    const found = selectWorkspace(layer({ w1: ['D:\\shared'] }), workspaces, session('s9', 'D:\\shared\\sub'))
    assert.equal(found?.id, 'w1')
  })

  it('matches a session started exactly at the workspace path', () => {
    const workspaces = [workspace('w1', 'E:/proj', []), workspace('w2', 'E:/other', [])]
    const found = selectWorkspace(layer({ w1: ['D:\\shared'] }), workspaces, session('s9', 'e:\\Proj'))
    assert.equal(found?.id, 'w1')
  })

  it('takes the deepest containing folder', () => {
    const workspaces = [workspace('w1', 'E:/proj', [], ['D:\\a']), workspace('w2', 'D:\\a\\b', [])]
    const found = selectWorkspace(layer({}), workspaces, session('s9', 'D:/a/b/c'))
    assert.equal(found?.id, 'w2')
  })

  it('finds nothing for a session outside every workspace', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'], ['D:\\shared'])]
    assert.equal(selectWorkspace(layer({}), workspaces, session('s9', 'C:\\temp')), undefined)
    assert.equal(selectWorkspace(layer({}), workspaces, {}), undefined)
  })

  it('refuses to guess when two workspaces own the same folder', () => {
    const workspaces = [workspace('w1', 'E:/one', []), workspace('w2', 'E:/two', [])]
    const found = selectWorkspace(layer({ w1: ['D:\\shared'], w2: ['D:\\shared'] }), workspaces, session('s9', 'D:\\shared\\x'))
    assert.equal(found, undefined)
  })
})

describe('prompt paragraph', () => {
  it('names every source folder of the session workspace', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'])]
    const text = sourceFoldersContext(layer({ w1: ['D:\\shared', 'D:\\other'] }), workspaces, session('s1', 'E:/proj'))
    assert.ok(text.includes(JSON.stringify('E:/proj')), text)
    assert.ok(text.includes(JSON.stringify('D:\\shared')), text)
    assert.ok(text.includes(JSON.stringify('D:\\other')), text)
    assert.match(text, /^The session workspace /)
  })

  it('says nothing when the workspace has no extra folder', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'])]
    assert.equal(sourceFoldersContext(layer({}), workspaces, session('s1', 'E:/proj')), '')
    assert.equal(sourceFoldersContext(layer({}), [], session('s1', 'E:/proj')), '')
  })

  it('names only the promoted primary and its extras', () => {
    const workspaces = [workspace('w1', 'E:/proj', ['s1'])]
    const text = sourceFoldersContext(
      layer({ w1: ['D:\\shared'] }, { w1: 'D:\\promoted' }),
      workspaces,
      session('s1', 'D:\\promoted'),
    )
    assert.ok(text.includes(JSON.stringify('D:\\promoted')), text)
    assert.ok(text.includes(JSON.stringify('D:\\shared')), text)
    assert.ok(!text.includes(JSON.stringify('E:/proj')), text)
  })
})

describe('path containment', () => {
  it('treats separators and drive-letter case as equal', () => {
    assert.ok(containsDirectory('D:\\Shared', 'd:/shared/sub/file.txt'))
    assert.ok(containsDirectory('D:\\Shared', 'D:\\Shared'))
    assert.ok(!containsDirectory('D:\\Shared', 'D:\\SharedOther'))
    assert.ok(!containsDirectory('', 'D:\\Shared'))
  })
})
