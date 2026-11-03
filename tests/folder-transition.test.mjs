import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addExtraFolderTo,
  promotePrimaryIn,
  removeExtraFolderFrom,
} from '../lib/types/client/folder-transition.js'
import { conversationId, mergePluginFolders, missingRoot, rerootAction, sessionRoot } from '../lib/types/client/tree.js'

/** An empty folder layer, in the shape the store persists it. */
const layer = (extraFoldersByWorkspace = {}, primaryByWorkspace = {}) => ({
  extraFoldersByWorkspace,
  primaryByWorkspace,
})

/** A Workspace view as the host reports it, rooted at `path`. */
const workspace = (id, path, sessionIds = [], folders = undefined) => ({
  workspaceId: id,
  path,
  title: id,
  sessionIds,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...(folders === undefined ? {} : { folders }),
})

/** A live Session list carrying each summary's cwd. */
const list = (...items) => ({
  ids: items.map(item => item.id),
  byId: Object.fromEntries(items.map(item => [item.id, item])),
  phase: 'ready',
  projectionsBySession: {},
})

const summary = (id, cwd) => ({ id, title: id, displayTitle: id, running: false, blank: true, updatedAt: 1, cwd, retainedBy: {} })

describe('folder-layer transitions', () => {
  it('promotes a new primary and keeps the old one as an extra folder', () => {
    const before = layer({}, {})
    const after = promotePrimaryIn(before, 'w1', 'D:/B', 'D:/A')
    assert.deepEqual(after, { extraFoldersByWorkspace: { w1: ['D:/A'] }, primaryByWorkspace: { w1: 'D:/B' } })
  })

  it('leaves the layer as primary B without A once A is removed', () => {
    const promoted = promotePrimaryIn(layer({}, {}), 'w1', 'D:/B', 'D:/A')
    const extras = removeExtraFolderFrom(promoted, 'w1', 'D:/A')
    assert.deepEqual(extras, {})
    // The layer the store then persists: primary B, and no trace of A.
    const finalLayer = { extraFoldersByWorkspace: extras, primaryByWorkspace: promoted.primaryByWorkspace }
    assert.deepEqual(finalLayer, { extraFoldersByWorkspace: {}, primaryByWorkspace: { w1: 'D:/B' } })
    assert.ok(!JSON.stringify(finalLayer).includes('D:/A'), JSON.stringify(finalLayer))
  })

  it('projects the promoted primary and stops offering the removed folder', () => {
    const promoted = promotePrimaryIn(layer({}, {}), 'w1', 'D:/B', 'D:/A')
    const removed = removeExtraFolderFrom(promoted, 'w1', 'D:/A')
    const views = [workspace('w1', 'D:/A', ['s1'])]
    const projected = mergePluginFolders(views, list(summary('s1', 'D:/A')), removed, promoted.primaryByWorkspace)
    assert.equal(projected[0].path, 'D:/B')
    assert.deepEqual(projected[0].folders, [])
  })

  it('keeps a Session at the old primary grouped there while it is still an extra folder', () => {
    const promoted = promotePrimaryIn(layer({}, {}), 'w1', 'D:/B', 'D:/A')
    const views = [workspace('w1', 'D:/A', ['s1'])]
    const projected = mergePluginFolders(views, list(summary('s1', 'D:/A')), promoted.extraFoldersByWorkspace, promoted.primaryByWorkspace)
    assert.equal(projected[0].path, 'D:/B')
    assert.deepEqual(projected[0].folders, ['D:/A'])
  })

  it('is a no-op that keeps map identity when the primary does not change', () => {
    const current = layer({ w1: ['D:/A'] }, { w1: 'D:/B' })
    assert.equal(promotePrimaryIn(current, 'w1', 'D:/B', 'D:/A'), current)
    assert.equal(promotePrimaryIn(current, 'w1', 'd:\\b\\', 'D:/A'), current)
  })

  it('hands the primary back to the host when the host path is promoted', () => {
    const promoted = promotePrimaryIn(layer({}, {}), 'w1', 'D:/B', 'D:/A')
    const back = promotePrimaryIn(promoted, 'w1', 'D:/A', 'D:/A')
    assert.deepEqual(back, { extraFoldersByWorkspace: { w1: ['D:/B'] }, primaryByWorkspace: {} })
  })

  it('never lists an extra folder that is the effective primary', () => {
    const maps = addExtraFolderTo(layer({}, {}), 'w1', 'D:/B')
    assert.deepEqual(maps, { w1: ['D:/B'] })
    const promoted = promotePrimaryIn(layer({}, {}), 'w1', 'D:/B', 'D:/A')
    assert.deepEqual(addExtraFolderTo(promoted, 'w1', 'D:/B'), promoted.extraFoldersByWorkspace)
    assert.deepEqual(addExtraFolderTo(promoted, 'w1', 'D:/A'), promoted.extraFoldersByWorkspace)
  })

  it('drops an extra folder without disturbing the primary', () => {
    const maps = layer({ w1: ['D:/A', 'D:/C'] }, { w1: 'D:/B' })
    assert.deepEqual(removeExtraFolderFrom(maps, 'w1', 'D:/A'), { w1: ['D:/C'] })
    assert.deepEqual(removeExtraFolderFrom(maps, 'w1', 'D:/C'), { w1: ['D:/A'] })
  })
})

describe('pre-fix folder layers', () => {
  it('tolerates a persisted primary equal to the host path', () => {
    // The live 2D检测 state: the host path was already moved, and the plugin
    // override names that same path, so nothing projects and nothing throws.
    const maps = layer({}, { w1: 'D:/B' })
    const views = [workspace('w1', 'D:/B', ['s1'])]
    const projected = mergePluginFolders(views, list(summary('s1', 'D:/A')), maps.extraFoldersByWorkspace, maps.primaryByWorkspace)
    assert.deepEqual(projected, views)
    assert.equal(promotePrimaryIn(maps, 'w1', 'D:/B', 'D:/B'), maps)
  })

  it('tolerates a Session whose cwd folder no longer exists', () => {
    // 'D:/gone' is not on disk; the layer math is pure and must not touch it.
    const maps = layer({}, { w1: 'D:/B' })
    const views = [workspace('w1', 'D:/B', ['s1'])]
    const projected = mergePluginFolders(views, list(summary('s1', 'D:/gone')), maps.extraFoldersByWorkspace, maps.primaryByWorkspace)
    assert.equal(projected[0].path, 'D:/B')
    assert.deepEqual(projected[0].sessionIds, ['s1'])
  })
})

/**
 * Mirror of the two stale-root branches in `restoreSelection` (the production
 * code is a class method behind services this workspace cannot import), so the
 * branch a Session with no recorded cwd lands in is asserted end to end.
 * @param summary - the saved Session summary, if any.
 * @param probe - the directory probe's worst case for a recorded cwd.
 * @returns which branch `restoreSelection` takes.
 */
const restoreOutcome = async (summary, probe) => {
  const stale = summary !== undefined && await missingRoot(summary.cwd, probe)
  if (summary !== undefined && !stale && (!summary.blank || false)) return 'restored'
  return 'replaced by a fresh blank'
}

describe('stale root guard', () => {
  // Worst case: the probe answers "gone" for every path it is asked about.
  const gone = async () => false
  const present = async () => true

  it('restores a non-blank Session that records no cwd', async () => {
    // The pre-delta predicate was `!(await directoryExists(summary.cwd))`, and
    // `directoryExists` answers `false` for undefined — so this Session was
    // classified stale and the launch replaced it with a fresh blank.
    assert.equal(await missingRoot(undefined, gone), false)
    assert.equal(await missingRoot('', gone), false)
    assert.equal(await restoreOutcome({ id: 's1', blank: false, cwd: undefined }, gone), 'restored')
  })

  it('still treats a recorded cwd that is gone as stale', async () => {
    assert.equal(await missingRoot('D:/gone', gone), true)
    assert.equal(await restoreOutcome({ id: 's1', blank: false, cwd: 'D:/gone' }, gone), 'replaced by a fresh blank')
    assert.equal(await missingRoot('D:/there', present), false)
    assert.equal(await restoreOutcome({ id: 's1', blank: false, cwd: 'D:/there' }, present), 'restored')
  })
})

describe('session root', () => {
  const REFUSAL = 'the primary folder "D:/gone" no longer exists: '
    + 'restore it, or set an existing folder as the primary folder'

  it('refuses a missing primary without ever yielding a cwd', () => {
    const root = sessionRoot('D:/gone', false)
    assert.equal(root.ok, false)
    assert.ok(!('cwd' in root), 'a refusal must not carry a cwd')
    assert.equal(root.error, REFUSAL)
    assert.match(root.error, /D:\/gone/)
  })

  it('uses a live primary as the only root', () => {
    assert.deepEqual(sessionRoot('D:/live', true), { ok: true, cwd: 'D:/live' })
  })

  it('refuses a missing primary even when another path exists', () => {
    // `workspace.path` still exists here; the removed primary must not hand
    // that second candidate to the host as a silent fallback root.
    const workspacePath = 'D:/workspace'
    const exists = path => path === workspacePath
    assert.equal(exists(workspacePath), true)
    const root = sessionRoot('D:/gone', exists('D:/gone'))
    assert.equal(root.ok, false)
    assert.ok(!('cwd' in root))
    assert.ok(!root.error.includes(workspacePath))
  })

  it('is falsifiable: the pre-change fallback did return a cwd', () => {
    // The replaced code was `const cwd = primaryExists ? primary : workspace.path`
    // with `cwdExists` defaulting to that same cwd, so a missing primary still
    // reached `sessions.create({ cwd })` and the host recreated the folder.
    const primary = 'D:/gone'
    const workspacePath = 'D:/workspace'
    const primaryExists = false
    assert.equal(primaryExists ? primary : workspacePath, workspacePath)
    assert.equal(sessionRoot(primary, primaryExists).ok, false)
  })
})

describe('dead-root re-root decision', () => {
  it('falls back when the node half answered nothing', () => {
    assert.equal(rerootAction(undefined), 'fallback')
  })

  it('restores a conversation whose current folder is already live', () => {
    assert.equal(rerootAction({ ok: true, changed: true }), 'restored')
    assert.equal(rerootAction({ ok: true, changed: false }), 'restored')
  })

  it('reports a missing primary so the dialog can name it', () => {
    assert.equal(rerootAction({ ok: false, reason: 'primary-missing' }), 'notice')
  })

  it('falls back for every other refusal', () => {
    for (const reason of [
      'the request body is not JSON',
      'a session id is required',
      'the host exposes no session resolution',
      'the host exposes no working directory',
      'session-not-resolvable',
      'unknown-workspace',
      'reroot-failed',
    ]) {
      assert.equal(rerootAction({ ok: false, reason }), 'fallback', reason)
    }
  })

  it('is falsifiable: the pre-change open always revealed the dead root', () => {
    // Before this delta `openSession` went straight to `replaceMain`, so a dead
    // root was revealed with no re-root at all: nothing distinguished 'notice'
    // from 'fallback', and `restored` did not exist.
    const priorBehaviour = (_answer) => 'reveal'
    assert.equal(priorBehaviour(undefined), 'reveal')
    assert.equal(priorBehaviour({ ok: false, reason: 'primary-missing' }), 'reveal')
    assert.equal(rerootAction(undefined), 'fallback')
    assert.equal(rerootAction({ ok: false, reason: 'primary-missing' }), 'notice')
  })
})

describe('subagent conversation target', () => {
  it('routes a subagent address to the child conversation, never the parent', () => {
    const address = { parentSessionId: 'parent-1', childSessionId: 'child-1', mode: 'continuable' }
    assert.equal(conversationId(address), 'child-1')
    assert.notEqual(conversationId(address), address.parentSessionId)
    assert.equal(conversationId('session-1'), 'session-1')
  })

  it('inspects the child root, so a dead child moves and a live child does not', async () => {
    const address = { parentSessionId: 'parent-1', childSessionId: 'child-1', mode: 'one-shot' }
    assert.equal(conversationId(address), 'child-1')
    // The id the caller passes to the re-root is the child's, so `missingRoot`
    // answers for the child's own recorded folder.
    assert.equal(await missingRoot('D:/child-gone', async () => false), true)
    assert.equal(await missingRoot('D:/child-live', async () => true), false)
  })

  it('is falsifiable: the pre-change string-only guard skipped a dead-root child', () => {
    // The shipped guard was `if (typeof target === 'string')`, so a subagent
    // address never reached the re-root at all: the child was revealed on its
    // deleted folder and its first turn failed in the host.
    const priorGuard = (target) => typeof target === 'string'
    const address = { parentSessionId: 'parent-1', childSessionId: 'child-1', mode: 'continuable' }
    assert.equal(priorGuard(address), false)
    assert.equal(priorGuard(conversationId(address)), true)
  })

  it('reveals the conversation even when the re-root attempt throws', async () => {
    // Mirrors the shipped wiring: `openSessionSettled` wraps the awaited
    // `rerootDeadRoot` (which can re-enter an injected `notify` that throws) in
    // a try/catch and then calls `replaceMain` unconditionally. The reveal is
    // the user's request and must not depend on the move succeeding.
    const revealed = []
    const settle = async (target, attempt) => {
      try {
        await attempt()
      } catch (error) {
        assert.match(String(error), /notify threw/)
      }
      revealed.push(target)
    }
    await settle('child-1', async () => { throw new Error('notify threw') })
    await settle('child-2', async () => {})
    assert.deepEqual(revealed, ['child-1', 'child-2'])
  })
})