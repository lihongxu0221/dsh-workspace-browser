/** Folder list that travels with a copied `.dsh` home, not with browser localStorage. */

/** Plugin-owned source folders and promoted primaries, keyed by workspace id. */
export interface FolderLayer {
  extraFoldersByWorkspace: Record<string, string[]>
  primaryByWorkspace: Record<string, string>
}

/** Empty layer. */
export function emptyFolderLayer(): FolderLayer {
  return { extraFoldersByWorkspace: {}, primaryByWorkspace: {} }
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item !== '')
}

function stringListMap(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const out: Record<string, string[]> = {}
  for (const [key, folders] of Object.entries(value)) {
    if (key === '' || !isStringList(folders)) continue
    out[key] = [...folders]
  }
  return out
}

function stringMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, path] of Object.entries(value)) {
    if (key === '' || typeof path !== 'string' || path === '') continue
    out[key] = path
  }
  return out
}

/** Read one persisted layer. Malformed input becomes empty rather than throwing. */
export function parseFolderLayer(raw: string): FolderLayer {
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return emptyFolderLayer()
    const record = value as Record<string, unknown>
    return {
      extraFoldersByWorkspace: stringListMap(record.extraFoldersByWorkspace),
      primaryByWorkspace: stringMap(record.primaryByWorkspace),
    }
  } catch {
    return emptyFolderLayer()
  }
}

function sameDirectory(a: string, b: string): boolean {
  const normalize = (path: string): string => {
    const trimmed = path.replace(/[\\/]+$/, '').replace(/\\/g, '/')
    return /^[a-z]:\//i.test(trimmed) ? trimmed.toLowerCase() : trimmed
  }
  return normalize(a) === normalize(b)
}

function unionFolders(left: readonly string[], right: readonly string[]): string[] {
  const out = [...left]
  for (const folder of right) {
    if (!out.some(item => sameDirectory(item, folder))) out.push(folder)
  }
  return out
}

/**
 * Combine the browser's local layer with the file copied inside `.dsh`.
 * A primary already chosen on this browser wins; otherwise the file's does.
 * @param local - layer already in the viewing store.
 * @param file - layer read from the home file.
 * @returns the combined layer and whether it differs from `local`.
 */
export function mergeFolderLayer(local: FolderLayer, file: FolderLayer): { layer: FolderLayer; changed: boolean } {
  const ids = new Set([
    ...Object.keys(local.extraFoldersByWorkspace),
    ...Object.keys(file.extraFoldersByWorkspace),
    ...Object.keys(local.primaryByWorkspace),
    ...Object.keys(file.primaryByWorkspace),
  ])
  const extraFoldersByWorkspace: Record<string, string[]> = {}
  const primaryByWorkspace: Record<string, string> = {}
  for (const id of ids) {
    const folders = unionFolders(local.extraFoldersByWorkspace[id] ?? [], file.extraFoldersByWorkspace[id] ?? [])
    if (folders.length > 0) extraFoldersByWorkspace[id] = folders
    const localPrimary = local.primaryByWorkspace[id]
    const filePrimary = file.primaryByWorkspace[id]
    const primary = localPrimary !== undefined && localPrimary !== '' ? localPrimary : filePrimary
    if (primary !== undefined && primary !== '') primaryByWorkspace[id] = primary
  }
  const layer = { extraFoldersByWorkspace, primaryByWorkspace }
  return { layer, changed: JSON.stringify(layer) !== JSON.stringify(local) }
}
