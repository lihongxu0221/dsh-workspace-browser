import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

const home = mkdtempSync(join(tmpdir(), 'dsh-workspace-browser-'))
mkdirSync(join(home, 'storages'), { recursive: true })
const layerFile = join(home, 'storages', 'workspace-browser-folders.json')
writeFileSync(
  layerFile,
  JSON.stringify({ extraFoldersByWorkspace: { w1: ['D:\\shared'] }, primaryByWorkspace: {} }),
  'utf8',
)
process.env.DSH_HOME = home

const { apply, inject } = await import('../lib/index.js')

after(() => {
  delete process.env.DSH_HOME
  rmSync(home, { recursive: true, force: true })
})

/**
 * Boot the node half against a stub host.
 * @param workspaces - workspace records the stub registry lists.
 * @returns the registered routes and the prompt context the half registered.
 */
const boot = (workspaces) => {
  const routes = []
  let entry
  const context = {
    connection: { fetch: { register: (route) => (routes.push(route), async () => {}) } },
    get: name => (name === 'workspaceRegistry' && workspaces !== undefined ? { list: () => workspaces } : undefined),
    inject: (names, callback) => {
      assert.deepEqual(names, ['systemPrompt'])
      callback({
        systemPrompt: {
          getContextOrder: name => (name === 'SANDBOX_POLICY' ? 110 : Number.NaN),
          context: value => {
            entry = value
          },
        },
      })
    },
  }
  apply(context)
  return { routes, entry }
}

describe('node half', () => {
  it('requires only the connection service', () => {
    assert.deepEqual(inject, ['connection'])
  })

  it('registers the folder-layer route', async () => {
    const { routes } = boot([])
    assert.equal(routes.length, 1)
    assert.equal(routes[0].path, '/api/workspace-browser/folders')
    const response = await routes[0].fetch(new Request('http://host/api/workspace-browser/folders', { method: 'GET' }))
    assert.deepEqual(await response.json(), { extraFoldersByWorkspace: { w1: ['D:\\shared'] }, primaryByWorkspace: {} })
  })

  it('registers a prompt context right after the sandbox policy', () => {
    const { entry } = boot([{ id: 'w1', path: 'E:/proj', sessionIds: ['s1'] }])
    assert.equal(entry.name, 'workspace-browser:folders')
    assert.equal(entry.order, 111)
    assert.equal(entry.interpolate, false)
  })

  it('names the workspace folders for an attached session', () => {
    const { entry } = boot([{ id: 'w1', path: 'E:/proj', sessionIds: ['s1'] }])
    const text = entry.text({ agent: { session: { id: 's1', header: { cwd: 'E:/proj' } } } })
    assert.ok(text.includes(JSON.stringify('D:\\shared')), text)
  })

  it('stays silent for an agentless prompt and for a host without a registry', () => {
    const { entry } = boot([{ id: 'w1', path: 'E:/proj', sessionIds: ['s1'] }])
    assert.equal(entry.text({}), '')
    assert.equal(entry.text({ agent: { session: { id: 's2', header: { cwd: 'C:\\temp' } } } }), '')
    const { entry: bare } = boot(undefined)
    assert.equal(bare.text({ agent: { session: { id: 's1', header: { cwd: 'E:/proj' } } } }), '')
  })
})
