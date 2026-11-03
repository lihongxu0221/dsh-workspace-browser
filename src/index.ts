/**
 * Workspace picker plugin, node half. The browser keeps its viewing store in
 * localStorage, which a copied `.dsh` home does not include. This half stores
 * the extra-folder layer in that home so the copy carries it, behind the
 * connection's existing authenticated `/api` fence.
 *
 * It also turns that layer into prompt context: the shipped host has neither the
 * folder API nor a multi-root sandbox, so naming the folders is the only way a
 * Session learns about them.
 *
 * The shipped host cannot repath a Workspace over its remote API either, so a
 * second route moves the Workspace record itself in process, through the
 * registry's own write path. A third route reports whether a directory still
 * exists, which is what keeps a Session whose folder was deleted from being
 * restored onto a dead root. A fourth route re-roots one such conversation
 * through the working-directory service, which the browser calls before it
 * makes that conversation current.
 */

import { readFileSync } from 'node:fs'
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { emptyFolderLayer, parseFolderLayer, sameDirectory, type FolderLayer } from './folder-layer.ts'
import { sourceFoldersContext, effectivePrimary, selectWorkspace, type SessionLike, type WorkspaceRecord } from './session-folders.ts'

/** Authenticated route the browser half reads and writes. */
const ROUTE = '/api/workspace-browser/folders'

/** Authenticated route that moves one host Workspace record onto a promoted folder. */
const PRIMARY_ROUTE = '/api/workspace-browser/primary'

/** Authenticated route reporting whether a directory still exists. */
const DIRECTORY_ROUTE = '/api/workspace-browser/directory'

/** Authenticated route moving one conversation off a folder that is gone. */
const REROOT_ROUTE = '/api/workspace-browser/reroot'

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

/** The slice of one host Workspace entity this half drives. */
interface WorkspaceEntityLike {
  readonly id?: string
  readonly path?: string
  /**
   * The entity's single write path. Private on the host's own type, but an
   * ordinary prototype method at runtime, and absent from a record this host
   * does not own (which the route reports as a refusal).
   */
  readonly mutate?: (update: (record: WorkspaceRecord) => WorkspaceRecord) => Promise<void>
}

/** The slice of the host's workspace registry this half uses. */
interface WorkspaceRegistryService {
  list(): readonly WorkspaceRecord[]
  /** Omitted by a host that exposes only the listing surface. */
  get?(id: string): WorkspaceEntityLike | undefined
}

/** One Session handle: enough to read the directory it is committed to. */
interface SessionHandleLike {
  readonly id?: string
  readonly header?: { readonly cwd?: string }
}

/** One live agent and the Session it owns. */
interface AgentLike {
  readonly id?: string
  readonly session?: SessionHandleLike
}

/** The slice of the host's agent registry this half uses. */
interface AgentRegistryService {
  /** A live agent by its shared agent/Session id, or none. */
  get?(id: string): AgentLike | undefined
}

/**
 * The slice of the host's working-directory service this half uses. `get`
 * reads the committed directory without filesystem I/O; `set` appends a
 * durable change event, which is what re-roots a Session whose folder is gone.
 */
interface WorkingDirectoryService {
  get?(session: SessionHandleLike): string | undefined
  set?(agent: AgentLike, path: string): Promise<unknown>
}

/** One Session a rescue moved (or failed to move) off a deleted folder. */
interface RerootedSession {
  readonly sessionId: string
  readonly ok: boolean
  readonly error?: string
}

/**
 * The slice of the host's session controller this half uses.
 *
 * `resolveAgent` resolves a Session to a live agent and resumes it when it is
 * not loaded. A resume does not stat the recorded cwd, which is the only reason
 * a conversation rooted in a deleted folder can be reached at all.
 */
interface SessionControllerService {
  resolveAgent?(sessionId: string): Promise<
    { readonly agent?: AgentLike; readonly error?: { readonly message?: string } } | undefined
  >
}

/** One re-root outcome: whether the conversation moved, or why it did not. */
type RerootResult =
  | {
      readonly ok: true
      readonly changed: boolean
      /** The directory the conversation now runs in, when it moved. */
      readonly path?: string
    }
  | {
      readonly ok: false
      readonly reason: string
      /** A directory the browser can name in its notice, when one is known. */
      readonly path?: string
      readonly error?: string
    }

/** One primary-route outcome: the canonical path, or the reason nothing moved. */
type PrimaryResult =
  | {
      readonly ok: true
      readonly path: string
      readonly changed: boolean
      /** Present only when a host service could be asked to rescue Sessions. */
      readonly rerooted?: readonly RerootedSession[]
    }
  | { readonly ok: false; readonly error: string }

/** One directory-route outcome: whether the path is an existing directory. */
type DirectoryResult = { readonly ok: true; readonly exists: boolean } | { readonly ok: false; readonly error: string }

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

/** The filesystem error code, when the thrown value carries one. */
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null | undefined)?.code
  return typeof code === 'string' ? code : ''
}

/** A readable message for any thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** One JSON response under the browser half's no-store policy. */
function jsonResponse(body: unknown, status?: number): Response {
  const headers = { 'cache-control': 'no-store' }
  return status === undefined ? Response.json(body, { headers }) : Response.json(body, { status, headers })
}

/**
 * Whether one path can serve as a directory.
 *
 * A missing path is not an error, and any other refusal (including a permission
 * failure) answers `true`, so an unreadable directory keeps behaving as it did
 * before this probe existed instead of blocking on it.
 * @param path - the directory to inspect.
 * @returns whether the path is an existing directory, or a tolerated failure.
 */
async function directoryUsable(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch (error) {
    const code = errorCode(error)
    return code !== 'ENOENT' && code !== 'ENOTDIR'
  }
}

/**
 * Move one host Workspace record onto an existing directory.
 *
 * The host's remote API has no repath method, but the registry entity owns a
 * single write path that stamps `updatedAt` and prunes its stale Session
 * candidates, so driving it here is what the host itself would do. Every
 * failure is a refusal value rather than a throw: the browser half has already
 * applied its own layer by the time this runs, so a host that cannot move the
 * record must not turn the action into an error.
 * @param ctx - host context carrying the workspace registry.
 * @param request - POST body naming the workspace and the directory it should own.
 * @returns the canonical path when the record moved, or the reason it did not.
 */
async function promotePrimary(ctx: HostContext, request: Request): Promise<PrimaryResult> {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return { ok: false, error: 'the request body is not JSON' }
    }
    if (typeof body !== 'object' || body === null) return { ok: false, error: 'the request body is not an object' }
    const { workspaceId, path } = body as { workspaceId?: unknown; path?: unknown }
    if (typeof workspaceId !== 'string' || workspaceId === '') return { ok: false, error: 'a workspace id is required' }
    if (typeof path !== 'string' || path === '') return { ok: false, error: 'a directory is required' }

    let canonical: string
    try {
      canonical = await realpath(path)
      if (!(await stat(canonical)).isDirectory()) return { ok: false, error: `${path} is not a directory` }
    } catch (error) {
      return { ok: false, error: `the directory ${path} could not be used: ${messageOf(error)}` }
    }

    const registry = ctx.get('workspaceRegistry') as WorkspaceRegistryService | undefined
    if (registry === undefined) return { ok: false, error: 'the host exposes no workspace registry' }
    if (typeof registry.get !== 'function') return { ok: false, error: 'the host exposes no workspace lookup' }
    const entity = registry.get(workspaceId)
    if (entity === undefined) return { ok: false, error: `unknown workspace ${workspaceId}` }
    if (typeof entity.path !== 'string') return { ok: false, error: `the workspace ${workspaceId} reports no path` }

    let records: readonly WorkspaceRecord[]
    try {
      records = registry.list()
    } catch (error) {
      return { ok: false, error: `the workspace registry could not be listed: ${messageOf(error)}` }
    }
    const owned = records.find(record => record.id === workspaceId)
    const sessionIds = owned?.sessionIds ?? []

    if (sameDirectory(entity.path, canonical)) {
      const rerooted = await rerootMissingSessions(ctx, sessionIds, canonical)
      return {
        ok: true, path: canonical, changed: false,
        ...(rerooted === undefined ? {} : { rerooted }),
      }
    }

    const owner = records.find(record => record.id !== workspaceId
      && typeof record.path === 'string' && sameDirectory(record.path, canonical))
    if (owner !== undefined) return { ok: false, error: `${canonical} already belongs to workspace ${owner.id}` }

    if (typeof entity.mutate !== 'function') return { ok: false, error: 'the host workspace cannot be repathed' }
    await entity.mutate(record => ({ ...record, path: canonical }))
    // The record moved: a Session still rooted in the deleted folder is rescued next.
    const rerooted = await rerootMissingSessions(ctx, sessionIds, canonical)
    return {
      ok: true, path: canonical, changed: true,
      ...(rerooted === undefined ? {} : { rerooted }),
    }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}

/**
 * Move the Sessions of one Workspace whose effective directory is gone onto the
 * directory that Workspace now owns.
 *
 * A Session keeps its own working root, so only an unusable one is touched: a
 * Session rooted in a source folder that still exists stays where it is, and one
 * that is not live has no agent to move. Both services are read through optional
 * service lookup, so a host that offers neither reports no rescue at all and this
 * route answers exactly what it answered before a rescue existed.
 * @param ctx - host context carrying the agent and working-directory services.
 * @param sessionIds - the Workspace's Sessions, as the registry records them.
 * @param target - the canonical directory the Workspace now owns.
 * @returns one entry per Session the rescue acted on, or no entries at all.
 */
async function rerootMissingSessions(
  ctx: HostContext,
  sessionIds: readonly string[],
  target: string,
): Promise<readonly RerootedSession[] | undefined> {
  try {
    const agents = ctx.get('agents') as AgentRegistryService | undefined
    if (agents === undefined || typeof agents.get !== 'function') return undefined
    const directories = ctx.get('workingDirectory') as WorkingDirectoryService | undefined
    if (directories === undefined || typeof directories.get !== 'function'
      || typeof directories.set !== 'function') return undefined
    const rerooted: RerootedSession[] = []
    for (const sessionId of sessionIds) {
      try {
        const agent = agents.get(sessionId)
        if (agent === undefined || agent.session === undefined) continue
        const current = directories.get(agent.session)
        if (current === undefined || current === '' || await directoryUsable(current)) continue
        await directories.set(agent, target)
        rerooted.push({ sessionId, ok: true })
      } catch (error) {
        rerooted.push({ sessionId, ok: false, error: messageOf(error) })
      }
    }
    return rerooted
  } catch {
    return undefined
  }
}

/**
 * Report whether one path is an existing directory.
 *
 * A missing path is data, not an error. Any other refusal (including a
 * permission failure) answers `exists: true`, so an unreadable directory keeps
 * behaving as it did before the probe instead of blocking the user.
 * @param request - GET whose `path` query names the directory to check.
 * @returns whether the path is an existing directory, or why it could not be checked.
 */
async function checkDirectory(request: Request): Promise<DirectoryResult> {
  try {
    const path = new URL(request.url).searchParams.get('path')
    if (path === null || path === '') return { ok: false, error: 'a directory is required' }
    return { ok: true, exists: await directoryUsable(path) }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}

/**
 * Register the folder-layer route for this plugin's lifetime.
 * @param ctx - host context carrying the connection Fetch registry.
 */
/**
 * Move one conversation off a folder that is gone, onto its Workspace's primary.
 *
 * A conversation whose current directory still exists is never touched. The
 * session controller resolves (resuming when needed) rather than the agent
 * registry, because a stored conversation has no live agent and resuming does
 * not stat the recorded cwd. Every other outcome is a refusal that changes
 * nothing; nothing in here throws out of the route.
 * @param ctx - host context carrying the session-controller and working-directory services.
 * @param request - POST whose JSON body names the Session.
 * @returns the outcome, or the reason nothing moved.
 */
async function rerootSession(ctx: HostContext, request: Request): Promise<RerootResult> {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return { ok: false, reason: 'the request body is not JSON' }
    }
    if (typeof body !== 'object' || body === null) {
      return { ok: false, reason: 'the request body is not an object' }
    }
    const sessionId = (body as { sessionId?: unknown }).sessionId
    if (typeof sessionId !== 'string' || sessionId === '') {
      return { ok: false, reason: 'a session id is required' }
    }
    const controllers = ctx.get('sessionController') as SessionControllerService | undefined
    if (controllers === undefined || typeof controllers.resolveAgent !== 'function') {
      return { ok: false, reason: 'the host exposes no session resolution' }
    }
    const directories = ctx.get('workingDirectory') as WorkingDirectoryService | undefined
    if (directories === undefined || typeof directories.get !== 'function'
      || typeof directories.set !== 'function') {
      return { ok: false, reason: 'the host exposes no working directory' }
    }
    const resolved = await controllers.resolveAgent(sessionId)
    const agent = resolved?.agent
    if (agent === undefined) {
      const failure = resolved?.error?.message
      return failure === undefined || failure === ''
        ? { ok: false, reason: 'session-not-resolvable' }
        : { ok: false, reason: 'session-not-resolvable', error: failure }
    }
    const session = agent.session ?? { id: sessionId }
    const current = directories.get(session)
    if (current !== undefined && current !== '' && await directoryUsable(current)) {
      return { ok: true, changed: false }
    }
    const layer = readLayerSync()
    const workspace = selectWorkspace(layer, registeredWorkspaces(ctx), session)
    if (workspace === undefined) return { ok: false, reason: 'unknown-workspace' }
    const primary = effectivePrimary(layer, workspace)
    if (primary === '' || !(await directoryUsable(primary))) {
      return { ok: false, reason: 'primary-missing', path: primary }
    }
    await directories.set(agent, primary)
    return { ok: true, changed: true, path: primary }
  } catch (error) {
    return { ok: false, reason: 'reroot-failed', error: messageOf(error) }
  }
}

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

  ctx.connection.fetch.register({
    path: PRIMARY_ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const result = await promotePrimary(ctx, request)
      return result.ok ? jsonResponse(result) : jsonResponse(result, 500)
    },
  })

  ctx.connection.fetch.register({
    path: DIRECTORY_ROUTE,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const result = await checkDirectory(request)
      return result.ok ? jsonResponse(result) : jsonResponse(result, 500)
    },
  })

  ctx.connection.fetch.register({
    path: REROOT_ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const result = await rerootSession(ctx, request)
      return result.ok ? jsonResponse(result) : jsonResponse(result, 500)
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
