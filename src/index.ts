/**
 * Workspace picker plugin, node half. The browser keeps its viewing store in
 * localStorage, which a copied `.dsh` home does not include. This half stores
 * the extra-folder layer in that home so the copy carries it, behind the
 * connection's existing authenticated `/api` fence.
 *
 * It also turns that layer into prompt context: the shipped host has neither the
 * folder API nor a multi-root sandbox, so naming the folders is the only way a
 * Session learns about them.
 */

import { readFileSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { emptyFolderLayer, parseFolderLayer, type FolderLayer } from './folder-layer.ts'
import { sourceFoldersContext, type SessionLike, type WorkspaceRecord } from './session-folders.ts'

/** Authenticated route the browser half reads and writes. */
const ROUTE = '/api/workspace-browser/folders'

/** Prompt context naming the Session workspace's source folders. */
const CONTEXT_NAME = 'workspace-browser:folders'

/** Required host service: the authenticated Fetch registry. */
export const inject = ['connection']

interface ConnectionFetch {
  register(route: {
    path: string
    methods: readonly ('GET' | 'POST')[]
    requestBody: 'buffered'
    fetch: (request: Request) => Promise<Response>
  }): () => Promise<void>
}

/** The slice of the host's system-prompt registry this half uses. */
interface SystemPromptService {
  getContextOrder(name: string): number
  context(entry: { name: string; order: number; text: (context: PromptContext) => string; interpolate?: boolean }): void
}

/** The context the host hands a prompt-context `text` function. */
interface PromptContext {
  agent?: { session?: SessionLike }
}

/** The slice of the host's workspace registry this half uses. */
interface WorkspaceRegistryService {
  list(): readonly WorkspaceRecord[]
}

interface HostContext {
  connection: { fetch: ConnectionFetch }
  get(name: string): unknown
  inject(names: readonly string[], callback: (scope: { systemPrompt: SystemPromptService }) => void): void
}

function dshHome(): string {
  const env = process.env.DSH_HOME
  return env !== undefined && env !== '' ? env : join(homedir(), '.dsh')
}

function layerPath(): string {
  return join(dshHome(), 'storages', 'workspace-browser-folders.json')
}

async function readLayer(): Promise<FolderLayer> {
  try {
    return parseFolderLayer(await readFile(layerPath(), 'utf8'))
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return emptyFolderLayer()
    throw error
  }
}

/** Read the layer from disk for prompt assembly, which cannot await. */
function readLayerSync(): FolderLayer {
  try {
    return parseFolderLayer(readFileSync(layerPath(), 'utf8'))
  } catch {
    return emptyFolderLayer()
  }
}

async function writeLayer(layer: FolderLayer): Promise<void> {
  const path = layerPath()
  await mkdir(join(dshHome(), 'storages'), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(layer)}\n`, 'utf8')
  await rename(temporary, path)
}

/** Workspace records of this host, or none when it has no workspace registry. */
function registeredWorkspaces(ctx: HostContext): readonly WorkspaceRecord[] {
  try {
    const registry = ctx.get('workspaceRegistry') as WorkspaceRegistryService | undefined
    return registry === undefined ? [] : registry.list()
  } catch {
    return []
  }
}

/**
 * Register the folder-layer route for this plugin's lifetime.
 * @param ctx - host context carrying the connection Fetch registry.
 */
export function apply(ctx: HostContext): void {
  ctx.connection.fetch.register({
    path: ROUTE,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        if (request.method === 'GET') return Response.json(await readLayer(), { headers: { 'cache-control': 'no-store' } })
        const layer = parseFolderLayer(await request.text())
        await writeLayer(layer)
        return Response.json(layer, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return Response.json({ error: message }, { status: 500, headers: { 'cache-control': 'no-store' } })
      }
    },
  })

  ctx.inject(['systemPrompt'], (scope) => {
    scope.systemPrompt.context({
      name: CONTEXT_NAME,
      order: scope.systemPrompt.getContextOrder('SANDBOX_POLICY') + 1,
      text: (context) => sourceFoldersContext(readLayerSync(), registeredWorkspaces(ctx), context.agent?.session ?? {}),
      // Folder paths are literal text: a `{{` inside one must not read as a prompt variable.
      interpolate: false,
    })
  })
}
