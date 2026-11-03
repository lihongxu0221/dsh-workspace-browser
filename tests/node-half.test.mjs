import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { after, describe, it } from 'node:test'

const home = mkdtempSync(join(tmpdir(), 'dsh-workspace-browser-'))
mkdirSync(join(home, 'storages'), { recursive: true })
const layerFile = join(home, 'storages', 'workspace-browser-folders.json')
writeFileSync(
  layerFile,
  JSON.stringify({ extraFoldersByWorkspace: { w1: ['D:\\\\shared'] }, primaryByWorkspace: {} }),
  'utf8',
)
process.env.DSH_HOME = home

// Fixtures for the primary route: one usable directory, one missing path, one file.
// `realpath` is the same call the route makes, so the expected canonical spelling matches.
const targetDirectory = await realpath(mkdtempSync(join(tmpdir(), 'dsh-target-')))
const missingPath = join(home, 'no-such-folder')
const deletedPath = join(home, 'deleted-folder')
const filePath = join(home, 'plain.txt')
writeFileSync(filePath, 'not a directory', 'utf8')

const { apply, inject } = await import('../lib/index.js')

after(() => {
  delete process.env.DSH_HOME
  rmSync(home, { recursive: true, force: true })
  rmSync(targetDirectory, { recursive: true, force: true })
})

/**
 * Boot the node half against a stub host.
 * @param workspaces - workspace records the stub registry lists.
 * @param registry - full fake registry; defaults to one that only lists records.
 * @param services - extra host services answered by `get`, keyed by service name.
 * @returns the registered routes and the prompt context the half registered.
 */
const boot = (workspaces, registry, services = {}) => {
  const routes = []
  let entry
  const fallback = workspaces === undefined ? undefined : { list: () => workspaces }
  const context = {
    connection: { fetch: { register: (route) => (routes.push(route), async () => {}) } },
    get: name => (name === 'workspaceRegistry' ? registry ?? fallback : services[name]),
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

/**
 * A fake host registry: `records` backs `list()`, and `get()` answers with a
 * mutate-capable entity, unless the record opts out of one.
 * @param records - the workspace records the registry holds.
 * @returns the fake registry, the records, and a count of mutation calls.
 */
const fakeRegistry = (records) => {
  const mutations = []
  return {
    records,
    mutations,
    list: () => records,
    get: (id) => {
      const record = records.find(item => item.id === id)
      if (record === undefined) return undefined
      if (record.mutable === false) return { id: record.id, path: record.path }
      return {
        id: record.id,
        path: record.path,
        mutate: async (update) => {
          mutations.push(id)
          Object.assign(record, update(record), { updatedAt: 'stamped' })
        },
      }
    },
  }
}

/** The registered route for one path. */
const routeAt = (routes, path) => {
  const route = routes.find(candidate => candidate.path === path)
  assert.ok(route !== undefined, `no route registered for ${path}`)
  return route
}

/** POST a JSON body (or a raw string) to the primary route. */
const postPrimary = (route, body) =>
  route.fetch(new Request('http://host/api/workspace-browser/primary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))

/** GET the directory route for one query string. */
const getDirectory = (route, query) =>
  route.fetch(new Request(`http://host/api/workspace-browser/directory?${query}`, { method: 'GET' }))

/** POST a JSON body (or a raw string) to the reroot route. */
const postReroot = (route, body) =>
  route.fetch(new Request('http://host/api/workspace-browser/reroot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))

/**
 * A fake session controller: `sessions` maps a Session id to the handle its
 * agent owns. An absent id answers the host's own not-found shape.
 * @param sessions - the Sessions this controller resolves.
 * @returns the fake controller.
 */
const sessionController = (sessions) => ({
  resolveAgent: async (id) => {
    const session = sessions[id]
    return session === undefined
      ? { error: { message: `session/not-found: ${id}` } }
      : { agent: { id, session } }
  },
})

/**
 * A fake working-directory service: `get` reports `current` for every Session,
 * and every `set` is recorded.
 * @param current - the directory `get` reports; undefined reports none.
 * @returns the fake service plus the `set` calls it recorded.
 */
const workingDirectory = (current) => {
  const moved = []
  return {
    moved,
    service: {
      get: () => current,
      set: async (agent, path) => {
        moved.push([agent.id, path])
        return path
      },
    },
  }
}

/** A workspace record shaped like the host's own. */
const record = (id, path, extra = {}) => ({
  id,
  path,
  title: `title ${id}`,
  sessionIds: [`session-${id}`],
  createdAt: 'created',
  updatedAt: 'updated',
  ...extra,
})

describe('node half', () => {
  it('requires only the connection service', () => {
    assert.deepEqual(inject, ['connection'])
  })

  it('registers the folder-layer route', async () => {
    const { routes } = boot([])
    const route = routeAt(routes, '/api/workspace-browser/folders')
    const response = await route.fetch(new Request('http://host/api/workspace-browser/folders', { method: 'GET' }))
    assert.deepEqual(await response.json(), { extraFoldersByWorkspace: { w1: ['D:\\\\shared'] }, primaryByWorkspace: {} })
  })

  it('registers the repath route, the directory probe, and the reroot route', () => {
    const { routes } = boot([])
    assert.equal(routes.length, 4)
    assert.deepEqual(routeAt(routes, '/api/workspace-browser/primary').methods, ['POST'])
    assert.deepEqual(routeAt(routes, '/api/workspace-browser/directory').methods, ['GET'])
    assert.deepEqual(routeAt(routes, '/api/workspace-browser/reroot').methods, ['POST'])
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
    assert.ok(text.includes(JSON.stringify('D:\\\\shared')), text)
  })

  it('stays silent for an agentless prompt and for a host without a registry', () => {
    const { entry } = boot([{ id: 'w1', path: 'E:/proj', sessionIds: ['s1'] }])
    assert.equal(entry.text({}), '')
    assert.equal(entry.text({ agent: { session: { id: 's2', header: { cwd: 'C:\\\\temp' } } } }), '')
    const { entry: bare } = boot(undefined)
    assert.equal(bare.text({ agent: { session: { id: 's1', header: { cwd: 'E:/proj' } } } }), '')
  })
})

describe('primary route', () => {
  it('moves the workspace record onto the canonical directory', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, path: targetDirectory, changed: true })
    assert.deepEqual(registry.mutations, ['w1'])
    assert.deepEqual(registry.records[0], {
      id: 'w1',
      path: targetDirectory,
      title: 'title w1',
      sessionIds: ['session-w1'],
      createdAt: 'created',
      updatedAt: 'stamped',
    })
  })

  it('canonicalizes a path spelled with a trailing separator', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: `${targetDirectory}${sep}`,
    })
    assert.deepEqual(await response.json(), { ok: true, path: targetDirectory, changed: true })
    assert.equal(registry.records[0].path, targetDirectory)
  })

  it('does not rewrite a record already on its canonical path', async () => {
    const registry = fakeRegistry([record('w1', targetDirectory)])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, path: targetDirectory, changed: false })
    assert.deepEqual(registry.mutations, [])
    assert.equal(registry.records[0].updatedAt, 'updated')
  })

  it('refuses an unknown workspace', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w9',
      path: targetDirectory,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: 'unknown workspace w9' })
    assert.equal(registry.records[0].path, 'D:\\old')
  })

  it('refuses when the host exposes no workspace registry', async () => {
    const { routes } = boot(undefined)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: 'the host exposes no workspace registry' })
  })

  it('refuses when the registry cannot look a workspace up', async () => {
    const { routes } = boot([], { list: () => [] })
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: 'the host exposes no workspace lookup' })
  })

  it('refuses a directory that does not exist', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: missingPath,
    })
    const body = await response.json()
    assert.equal(response.status, 500)
    assert.equal(body.ok, false)
    assert.ok(body.error.includes(missingPath), body.error)
    assert.equal(registry.records[0].path, 'D:\\old')
  })

  it('refuses a path that is not a directory', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: filePath,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: `${filePath} is not a directory` })
  })

  it('refuses a directory another workspace already owns', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old'), record('w2', targetDirectory)])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {
      ok: false,
      error: `${targetDirectory} already belongs to workspace w2`,
    })
    assert.equal(registry.records[0].path, 'D:\\old')
  })

  it('refuses when the workspace cannot be repathed', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old', { mutable: false })])
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: 'the host workspace cannot be repathed' })
  })

  it('reports a failing write without throwing', async () => {
    const records = [record('w1', 'D:\\old')]
    const registry = {
      list: () => records,
      get: () => ({
        id: 'w1',
        path: 'D:\\old',
        mutate: async () => {
          throw new Error('the write chain is busy')
        },
      }),
    }
    const { routes } = boot([], registry)
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: 'the write chain is busy' })
    assert.equal(records[0].path, 'D:\\old')
  })

  it('refuses a malformed body', async () => {
    const { routes } = boot([], fakeRegistry([]))
    const route = routeAt(routes, '/api/workspace-browser/primary')
    assert.deepEqual(await (await postPrimary(route, 'not json')).json(), { ok: false, error: 'the request body is not JSON' })
    assert.deepEqual(await (await postPrimary(route, '"a string"')).json(), { ok: false, error: 'the request body is not an object' })
    assert.deepEqual(await (await postPrimary(route, { path: targetDirectory })).json(), { ok: false, error: 'a workspace id is required' })
    assert.deepEqual(await (await postPrimary(route, { workspaceId: 'w1' })).json(), { ok: false, error: 'a directory is required' })
  })
})

describe('primary route rescue', () => {
  /** A live agent per Session id, as the host's agent registry would answer. */
  const liveAgents = (ids) => ({
    get: id => (ids.includes(id) ? { id, session: { id } } : undefined),
  })

  it('re-roots a live Session whose folder is gone', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const moved = []
    const { routes } = boot([], registry, {
      agents: liveAgents(['session-w1']),
      workingDirectory: {
        get: () => deletedPath,
        set: async (agent, path) => {
          moved.push([agent.id, path])
          return path
        },
      },
    })
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.deepEqual(await response.json(), {
      ok: true,
      path: targetDirectory,
      changed: true,
      rerooted: [{ sessionId: 'session-w1', ok: true }],
    })
    assert.deepEqual(moved, [['session-w1', targetDirectory]])
  })

  it('re-roots even when the record already owns the canonical path', async () => {
    const registry = fakeRegistry([record('w1', targetDirectory)])
    const moved = []
    const { routes } = boot([], registry, {
      agents: liveAgents(['session-w1']),
      workingDirectory: {
        get: () => deletedPath,
        set: async (agent, path) => {
          moved.push(agent.id)
          return path
        },
      },
    })
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.deepEqual(await response.json(), {
      ok: true,
      path: targetDirectory,
      changed: false,
      rerooted: [{ sessionId: 'session-w1', ok: true }],
    })
    assert.deepEqual(moved, ['session-w1'])
  })

  it('leaves a Session rooted in a folder that still exists', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    let moved = 0
    const { routes } = boot([], registry, {
      agents: liveAgents(['session-w1']),
      workingDirectory: {
        get: () => targetDirectory,
        set: async () => {
          moved += 1
        },
      },
    })
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    const body = await response.json()
    assert.equal(body.changed, true)
    assert.deepEqual(body.rerooted, [])
    assert.equal(moved, 0)
  })

  it('contains a failing re-root and keeps the other Sessions', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old', { sessionIds: ['session-a', 'session-b'] })])
    const moved = []
    const { routes } = boot([], registry, {
      agents: liveAgents(['session-a', 'session-b']),
      workingDirectory: {
        get: () => deletedPath,
        set: async (agent, path) => {
          if (agent.id === 'session-a') throw new Error('the write chain is busy')
          moved.push(agent.id)
          return path
        },
      },
    })
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.deepEqual(await response.json(), {
      ok: true,
      path: targetDirectory,
      changed: true,
      rerooted: [
        { sessionId: 'session-a', ok: false, error: 'the write chain is busy' },
        { sessionId: 'session-b', ok: true },
      ],
    })
    assert.deepEqual(moved, ['session-b'])
    assert.equal(registry.records[0].path, targetDirectory)
  })

  it('skips a Session with no live agent and a host without the services', async () => {
    const registry = fakeRegistry([record('w1', 'D:\\old')])
    const { routes } = boot([], registry, {
      agents: { get: () => undefined },
      workingDirectory: { get: () => deletedPath, set: async () => {} },
    })
    const response = await postPrimary(routeAt(routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w1',
      path: targetDirectory,
    })
    assert.deepEqual((await response.json()).rerooted, [])

    // No agent registry and no working-directory service: the body is exactly
    // what the route answered before a rescue existed.
    const bare = boot([], fakeRegistry([record('w2', 'D:\\old')]))
    const bareResponse = await postPrimary(routeAt(bare.routes, '/api/workspace-browser/primary'), {
      workspaceId: 'w2',
      path: targetDirectory,
    })
    const body = await bareResponse.json()
    assert.deepEqual(body, { ok: true, path: targetDirectory, changed: true })
    assert.ok(!('rerooted' in body))
  })
})

describe('directory route', () => {
  it('reports an existing directory', async () => {
    const { routes } = boot([])
    const response = await getDirectory(routeAt(routes, '/api/workspace-browser/directory'), `path=${encodeURIComponent(targetDirectory)}`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, exists: true })
  })

  it('reports a missing directory as absent, not as a failure', async () => {
    const { routes } = boot([])
    const response = await getDirectory(routeAt(routes, '/api/workspace-browser/directory'), `path=${encodeURIComponent(missingPath)}`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, exists: false })
  })

  it('reports a file as absent', async () => {
    const { routes } = boot([])
    const response = await getDirectory(routeAt(routes, '/api/workspace-browser/directory'), `path=${encodeURIComponent(filePath)}`)
    assert.deepEqual(await response.json(), { ok: true, exists: false })
  })

  it('refuses a probe without a path', async () => {
    const { routes } = boot([])
    const response = await getDirectory(routeAt(routes, '/api/workspace-browser/directory'), '')
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, error: 'a directory is required' })
  })
})

describe('reroot route', () => {
  it('re-roots a conversation whose recorded folder is gone', async () => {
    const registry = fakeRegistry([record('w1', targetDirectory, { sessionIds: ['session-w1'] })])
    const { moved, service } = workingDirectory(deletedPath)
    const { routes } = boot([], registry, {
      sessionController: sessionController({ 'session-w1': { id: 'session-w1', header: { cwd: deletedPath } } }),
      workingDirectory: service,
    })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 'session-w1' })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, changed: true, path: targetDirectory })
    assert.deepEqual(moved, [['session-w1', targetDirectory]])
  })

  it('leaves a conversation whose current folder still exists alone', async () => {
    const registry = fakeRegistry([record('w1', targetDirectory, { sessionIds: ['session-w1'] })])
    const { moved, service } = workingDirectory(targetDirectory)
    const { routes } = boot([], registry, {
      sessionController: sessionController({ 'session-w1': { id: 'session-w1' } }),
      workingDirectory: service,
    })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 'session-w1' })
    assert.deepEqual(await response.json(), { ok: true, changed: false })
    assert.deepEqual(moved, [])
  })

  it('refuses when the Workspace primary folder is itself gone', async () => {
    const registry = fakeRegistry([record('w1', missingPath, { sessionIds: ['session-w1'] })])
    const { moved, service } = workingDirectory(deletedPath)
    const { routes } = boot([], registry, {
      sessionController: sessionController({ 'session-w1': { id: 'session-w1' } }),
      workingDirectory: service,
    })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 'session-w1' })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, reason: 'primary-missing', path: missingPath })
    assert.deepEqual(moved, [])
  })

  it('refuses a Session it cannot map to a Workspace', async () => {
    const registry = fakeRegistry([record('w1', targetDirectory)])
    const { service } = workingDirectory(deletedPath)
    const { routes } = boot([], registry, {
      sessionController: sessionController({ 'session-none': { id: 'session-none' } }),
      workingDirectory: service,
    })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 'session-none' })
    assert.deepEqual(await response.json(), { ok: false, reason: 'unknown-workspace' })
  })

  it('refuses a Session the controller cannot resolve, naming the host error', async () => {
    const { service } = workingDirectory(deletedPath)
    const { routes } = boot([], fakeRegistry([]), {
      sessionController: sessionController({}),
      workingDirectory: service,
    })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 'session-gone' })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {
      ok: false,
      reason: 'session-not-resolvable',
      error: 'session/not-found: session-gone',
    })
  })

  it('refuses when the host exposes no session resolution', async () => {
    const { routes } = boot([], fakeRegistry([]))
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 's' })
    assert.deepEqual(await response.json(), { ok: false, reason: 'the host exposes no session resolution' })
  })

  it('refuses when the host exposes no working directory', async () => {
    const { routes } = boot([], fakeRegistry([]), { sessionController: sessionController({ s: { id: 's' } }) })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 's' })
    assert.deepEqual(await response.json(), { ok: false, reason: 'the host exposes no working directory' })
  })

  it('reports a failing move without throwing', async () => {
    const registry = fakeRegistry([record('w1', targetDirectory, { sessionIds: ['session-w1'] })])
    const { routes } = boot([], registry, {
      sessionController: sessionController({ 'session-w1': { id: 'session-w1' } }),
      workingDirectory: {
        get: () => deletedPath,
        set: async () => { throw new Error('the write chain is busy') },
      },
    })
    const response = await postReroot(routeAt(routes, '/api/workspace-browser/reroot'), { sessionId: 'session-w1' })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {
      ok: false,
      reason: 'reroot-failed',
      error: 'the write chain is busy',
    })
  })

  it('refuses a malformed body or a missing Session id', async () => {
    const { routes } = boot([], fakeRegistry([]))
    const route = routeAt(routes, '/api/workspace-browser/reroot')
    assert.deepEqual(await (await postReroot(route, 'not json')).json(), {
      ok: false,
      reason: 'the request body is not JSON',
    })
    assert.deepEqual(await (await postReroot(route, '"a string"')).json(), {
      ok: false,
      reason: 'the request body is not an object',
    })
    assert.deepEqual(await (await postReroot(route, { sessionId: '' })).json(), {
      ok: false,
      reason: 'a session id is required',
    })
  })
})