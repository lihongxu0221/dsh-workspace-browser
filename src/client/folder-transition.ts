/**
 * Pure folder-layer transitions for the viewing store.
 *
 * The store actions apply exactly this math to one draft; keeping it here lets
 * the promote-then-remove sequence be reasoned about and tested without the
 * store engine (whose zoo of browser-only peers is not installed for tests).
 */
import { samePath } from './tree.ts'

/** The two plugin-owned folder maps, in the shape the store persists them. */
export interface FolderMaps {
  readonly extraFoldersByWorkspace: Readonly<Record<string, readonly string[]>>
  /** Absent in a pre-folder snapshot, like the store field it mirrors. */
  readonly primaryByWorkspace?: Readonly<Record<string, string>>
}

/**
 * Register one extra source folder for a Workspace.
 * @returns the same map when the folder is already listed or already primary.
 */
export function addExtraFolderTo(
  maps: FolderMaps,
  workspaceId: string,
  path: string,
): Readonly<Record<string, readonly string[]>> {
  const folders = maps.extraFoldersByWorkspace[workspaceId] ?? []
  if (folders.some(folder => samePath(folder, path))) return maps.extraFoldersByWorkspace
  if (samePath(maps.primaryByWorkspace?.[workspaceId], path)) return maps.extraFoldersByWorkspace
  return { ...maps.extraFoldersByWorkspace, [workspaceId]: [...folders, path] }
}

/**
 * Drop one extra source folder.
 * @returns the map without the folder, dropping the Workspace key when nothing remains.
 */
export function removeExtraFolderFrom(
  maps: FolderMaps,
  workspaceId: string,
  path: string,
): Readonly<Record<string, readonly string[]>> {
  const folders = maps.extraFoldersByWorkspace[workspaceId] ?? []
  const remaining = folders.filter(folder => !samePath(folder, path))
  const byWorkspace = { ...maps.extraFoldersByWorkspace }
  if (remaining.length === 0) delete byWorkspace[workspaceId]
  else byWorkspace[workspaceId] = remaining
  return byWorkspace
}

/**
 * Promote `path` to the plugin-owned primary. The previous effective directory
 * becomes an extra folder so Sessions left there stay grouped; promoting the
 * host path itself hands the primary back to the host and lifts the promoted
 * folder into extras.
 * @returns both maps, or `maps` verbatim when the promotion changes nothing.
 */
export function promotePrimaryIn(
  maps: FolderMaps,
  workspaceId: string,
  path: string,
  hostPath: string,
): FolderMaps {
  const extras = maps.extraFoldersByWorkspace[workspaceId] ?? []
  const current = maps.primaryByWorkspace?.[workspaceId]
  const effective = current !== undefined && !samePath(current, hostPath) ? current : hostPath
  if (samePath(path, effective)) return maps
  let nextExtras = extras.filter(folder => !samePath(folder, path))
  const primary = { ...maps.primaryByWorkspace }
  if (samePath(path, hostPath)) {
    if (!samePath(effective, hostPath) && !nextExtras.some(folder => samePath(folder, effective))) {
      nextExtras = [...nextExtras, effective]
    }
    delete primary[workspaceId]
  } else {
    if (!nextExtras.some(folder => samePath(folder, effective))) nextExtras = [...nextExtras, effective]
    primary[workspaceId] = path
  }
  const byWorkspace = { ...maps.extraFoldersByWorkspace }
  if (nextExtras.length === 0) delete byWorkspace[workspaceId]
  else byWorkspace[workspaceId] = nextExtras
  return { extraFoldersByWorkspace: byWorkspace, primaryByWorkspace: primary }
}