/** Load and save the `.dsh` folder layer. localStorage stays the live cache. */
import { mergeFolderLayer, parseFolderLayer, type FolderLayer } from '../folder-layer.ts'

/** Authenticated route registered by the node half. */
const ROUTE = '/api/workspace-browser/folders'

interface FolderStore {
  getSnapshot(): {
    extraFoldersByWorkspace?: Record<string, string[]>
    primaryByWorkspace?: Record<string, string>
  }
  subscribe(fn: () => void): () => void
  actions: {
    installFolderLayer: (layer: FolderLayer) => void
  }
}

function layerOf(store: FolderStore): FolderLayer {
  const snap = store.getSnapshot()
  return {
    extraFoldersByWorkspace: snap.extraFoldersByWorkspace ?? {},
    primaryByWorkspace: snap.primaryByWorkspace ?? {},
  }
}

async function readFileLayer(): Promise<FolderLayer | undefined> {
  const response = await fetch(ROUTE, { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) return undefined
  return parseFolderLayer(await response.text())
}

async function writeFileLayer(layer: FolderLayer): Promise<void> {
  const response = await fetch(ROUTE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(layer),
  })
  if (!response.ok) throw new Error(`folder layer save failed: ${response.status}`)
}

/**
 * Union the home file into the viewing store, then keep the file current.
 * A missing route (plugin node half not active) leaves the local store alone.
 * @param store - the browser viewing-store instance.
 */
export function syncFolderLayer(store: FolderStore): void {
  let posted = ''
  let ready = false
  const publish = (): void => {
    if (!ready) return
    const layer = layerOf(store)
    const body = JSON.stringify(layer)
    if (body === posted) return
    posted = body
    void writeFileLayer(layer).catch((error: unknown) => {
      posted = ''
      console.warn('workspace folder layer was not saved:', error)
    })
  }
  store.subscribe(publish)
  void readFileLayer().then((file) => {
    if (file !== undefined) {
      const merged = mergeFolderLayer(layerOf(store), file)
      if (merged.changed) store.actions.installFolderLayer(merged.layer)
    }
    ready = true
    publish()
  }).catch((error: unknown) => {
    ready = true
    console.warn('workspace folder layer was not loaded:', error)
  })
}
