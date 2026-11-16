/**
 * Dependency catalog routes: installed state, npm download counts, single
 * install/update and update-all, all through the host plugin manager.
 *
 * The routes live on the same authenticated web server as the rest of the
 * plugin. Authentication reuses the connection service's request fence; a
 * missing fence is a hard 503 rather than an unauthenticated write path.
 */
import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import {
  dependencyStatuses,
  installDependency,
  installProgressSnapshot,
  noteHostInstallState,
  resolveDependencyRuntime,
  updateAllDependencies,
} from './dependency-manager.ts'

type HostRequest = {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}
type HostResponse = {
  writeHead: (status: number, headers?: Record<string, string>) => void
  end: (body?: string) => void
}
type HostWebServer = {
  register: (route: {
    kind: 'exact'
    path: string
    handler: (request: HostRequest, response: HostResponse) => Promise<void>
  }) => (() => void) | undefined
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

/** Path scratches are not useful to a browser; keep our own explanations. */
export function publicDependencyError(error: unknown): string {
  const message = error instanceof Error ? error.message : '依赖管理暂不可用。'
  if (/[A-Za-z]:[\\/]|\/(?:home|root|Users|var|tmp)\//.test(message)) return '依赖管理暂不可用，请查看服务端日志。'
  return message
}

export class RequestBodyTooLargeError extends Error {}

function headerValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

/** Read a small JSON body; the mutating calls never need more than 32 KiB. */
export async function readRequestBody(request: HostRequest, maxBytes = 32 * 1024): Promise<string> {
  const declared = Number(headerValue(request.headers ?? {}, 'content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLargeError('请求体过大。')
  if (request[Symbol.asyncIterator] === undefined) return ''
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.length
    if (length > maxBytes) throw new RequestBodyTooLargeError('请求体过大。')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Reject before reading the body or performing mutations. */
function authenticate(ctx: Context, request: HostRequest, response: HostResponse): boolean {
  const reject = (status: 401 | 403 | 503, message: string): false => {
    response.writeHead(status, JSON_HEADERS)
    response.end(JSON.stringify({ error: message }))
    return false
  }
  try {
    const connection = ctx.get('connection') as {
      requestRejection?: (request: { headers?: HostRequest['headers'] }) => 401 | 403 | undefined
    } | undefined
    if (typeof connection?.requestRejection !== 'function') {
      ctx.logger.warn('workspace-browser dependency REST authentication unavailable: no connection.requestRejection')
      return reject(503, '宿主认证服务暂不可用。')
    }
    const rejection = connection.requestRejection(request)
    if (rejection !== undefined) {
      return reject(rejection, rejection === 401 ? '请先登录 DSH。' : '已拒绝不可信或跨站请求。')
    }
    return true
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : typeof error
    ctx.logger.warn('workspace-browser dependency REST authentication failed: %s', reason)
    return reject(503, '宿主认证服务暂不可用。')
  }
}

/** Register the catalog routes when the host exposes a web server. */
export function registerDependencyRoutes(ctx: Context): void {
  // The dependency page is only meaningful when the host's plugin manager is
  // present. Keeping this probe on the root context also avoids turning the
  // web server into a hard startup dependency for the rest of the browser.
  if (ctx.get('pluginManager') === undefined) return
  const install = (host: Context): void => {
    const webServer = host.get('webServer') as HostWebServer | undefined
    if (webServer === undefined || typeof webServer.register !== 'function') return
    host.effect(() => {
      const dispose = webServer.register({
        kind: 'exact',
        path: CODEX_UI_API_ENDPOINTS.dependencies,
        handler: async (request, response) => {
          if (!authenticate(host, request, response)) return
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET') {
            if (url.searchParams.get('action') === 'progress') {
              response.writeHead(200, JSON_HEADERS)
              response.end(JSON.stringify({ progress: installProgressSnapshot() }))
              return
            }
            const dependencies = await dependencyStatuses(resolveDependencyRuntime(host))
            response.writeHead(200, JSON_HEADERS)
            response.end(JSON.stringify({ dependencies }))
            return
          }
          if (request.method === 'POST') {
            const runtime = resolveDependencyRuntime(host)
            const result = url.searchParams.get('action') === 'update-all'
              ? await updateAllDependencies(runtime)
              : await installDependency(url.searchParams.get('dependency'), runtime)
            const failed = result.application === 'failed' || result.application === 'cancelled'
            let failureMessage: string | undefined
            if (failed) {
              if (result.application === 'cancelled') {
                failureMessage = '依赖安装已取消。'
              } else {
                const failedItem = result.results.find(item => item.application === 'failed' || item.application === 'cancelled')
                const errKind = failedItem?.error?.kind
                const errCode = failedItem?.error?.code
                const errMsg = failedItem?.error?.message ?? failedItem?.error?.diagnostic
                if (errKind === 'timeout' || errCode === 'timeout' || /timeout|timed out/i.test(errMsg ?? '')) {
                  failureMessage = '插件安装超时，请检查网络后重试。'
                } else {
                  failureMessage = '从 npm 安装或更新依赖失败。请检查网络或 npm registry 后重试。'
                }
              }
            }
            const sanitizedResults = result.results.map(item => ({
              ...item,
              ...(item.error !== undefined ? {
                error: {
                  ...item.error,
                  ...(item.error.message !== undefined ? { message: publicDependencyError(new Error(item.error.message)) } : {}),
                  ...(item.error.diagnostic !== undefined ? { diagnostic: publicDependencyError(new Error(item.error.diagnostic)) } : {}),
                },
              } : {}),
            }))
            response.writeHead(failed ? 503 : 200, JSON_HEADERS)
            response.end(JSON.stringify({
              ...result,
              results: sanitizedResults,
              restartRequired: result.results.some(item => item.application === 'restart-required' || item.restore?.application === 'restart-required'),
              autoReload: false,
              ...(failed && failureMessage !== undefined ? { error: publicDependencyError(new Error(failureMessage)) } : {}),
            }))
            return
          }
          response.writeHead(405)
          response.end()
        } catch (error) {
          host.logger.warn('workspace-browser dependencies endpoint failed: %s', error)
          response.writeHead(503, JSON_HEADERS)
          response.end(JSON.stringify({ error: publicDependencyError(error) }))
        }
      },
    })
    return () => { dispose?.() }
  }, 'workspace-browser: dependency catalog')

    host.effect(() => {
      if (typeof host.on !== 'function') return () => {}
      return (host.on as (event: string, listener: (arg: unknown) => void) => () => void)('plugin-manager/install-state', (event: unknown) => {
        noteHostInstallState(event)
      })
    }, 'workspace-browser: plugin-manager install state')
  }
  if (ctx.get('webServer') !== undefined) install(ctx)
  else ctx.inject(['webServer'], install)
}