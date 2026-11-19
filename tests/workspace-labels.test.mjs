import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { distinguishingSuffix, workspaceMenuLabels } from '../lib/types/client/workspace-labels.js'

/** Row shape the labels consume (id + host path). */
function row(workspaceId, path) {
  return { workspaceId, path }
}

/** Base label keyed by the path's last segment, the way the picker derives titles. */
function byLastSegment(workspace) {
  const parts = workspace.path.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] ?? 'workspace'
}

describe('workspace picker labels', () => {
  it('leaves uniquely titled rows on their ordinary label', () => {
    const labels = workspaceMenuLabels(
      [row('a', 'E:\\work\\alpha'), row('b', 'E:\\work\\beta')],
      byLastSegment,
    )
    assert.equal(labels.get('a'), 'alpha')
    assert.equal(labels.get('b'), 'beta')
  })

  it('tells same-titled rows apart with one trailing segment when parents differ', () => {
    const labels = workspaceMenuLabels(
      [row('a', 'E:\\work\\app'), row('b', 'E:\\personal\\app')],
      byLastSegment,
    )
    assert.equal(labels.get('a'), 'app (work/app)')
    assert.equal(labels.get('b'), 'app (personal/app)')
  })

  it('deepens the suffix until the rows are distinguishable', () => {
    const labels = workspaceMenuLabels(
      [row('a', '/srv/team/work/app'), row('b', '/srv/team/play/app')],
      byLastSegment,
    )
    assert.equal(labels.get('a'), 'app (work/app)')
    assert.equal(labels.get('b'), 'app (play/app)')
  })

  it('keeps three-way collisions distinct at their own depths', () => {
    const labels = workspaceMenuLabels(
      [row('a', '/x/app'), row('b', '/y/z/app'), row('c', '/y/w/app')],
      byLastSegment,
    )
    assert.equal(labels.get('a'), 'app (x/app)')
    assert.equal(labels.get('b'), 'app (z/app)')
    assert.equal(labels.get('c'), 'app (w/app)')
  })

  it('falls back to the plain label for identical paths and tolerates trailing separators', () => {
    const labels = workspaceMenuLabels(
      [row('a', 'E:\\work\\app\\'), row('b', 'E:\\work\\app')],
      byLastSegment,
    )
    assert.equal(labels.get('a'), 'app')
    assert.equal(labels.get('b'), 'app')
  })

  it('reports no suffix for a path without segments', () => {
    assert.equal(distinguishingSuffix('', ['E:\\work\\app']), null)
    assert.equal(distinguishingSuffix('E:\\work\\app', []), 'app')
  })
})
