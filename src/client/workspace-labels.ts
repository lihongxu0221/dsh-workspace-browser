/**
 * Picker labels for Workspace rows. A row is labelled with its display title
 * unless several Workspaces share that title: those rows then carry the
 * shortest trailing path segments that tell them apart, so two projects both
 * called `app` stay distinguishable without widening every row to a full path.
 */

/** The slice of a Workspace row these labels need. */
export interface WorkspaceLabelSource {
  readonly workspaceId: string
  readonly path: string
}

/** Both separators: host paths are canonical, but labels must not assume one. */
const SEPARATORS = /[\\/]+/

/** Path segments without empty entries (drive prefixes stay one segment). */
function pathSegments(path: string): readonly string[] {
  return path.split(SEPARATORS).filter(segment => segment.length > 0)
}

/**
 * Shortest trailing segments of `path` that no rival path shares.
 * @param path - the Workspace directory being labelled.
 * @param others - directories of the Workspaces sharing its display title.
 * @returns the joined suffix, or null when no suffix length distinguishes it
 * (identical paths, or a path with no segments at all).
 */
export function distinguishingSuffix(path: string, others: readonly string[]): string | null {
  const segments = pathSegments(path)
  if (segments.length === 0) return null
  const rivals = others.map(pathSegments)
  for (let take = 1; take <= segments.length; take += 1) {
    const candidate = segments.slice(-take).join('/')
    const unique = rivals.every(rival => rival.slice(-take).join('/') !== candidate)
    if (unique) return candidate
  }
  return null
}

/**
 * Label every row of a Workspace list for the picker.
 * @param workspaces - rows in menu order.
 * @param baseLabel - the row's ordinary display title.
 * @returns workspace id to label; colliding titles gain a `(suffix)` tail.
 */
export function workspaceMenuLabels<T extends WorkspaceLabelSource>(
  workspaces: readonly T[],
  baseLabel: (workspace: T) => string,
): ReadonlyMap<string, string> {
  const bases: string[] = []
  const groups = new Map<string, number[]>()
  workspaces.forEach((workspace, index) => {
    const base = baseLabel(workspace)
    bases.push(base)
    const group = groups.get(base)
    if (group === undefined) groups.set(base, [index])
    else group.push(index)
  })
  const labels = new Map<string, string>()
  workspaces.forEach((workspace, index) => {
    const base = bases[index] as string
    const group = groups.get(base) ?? []
    if (group.length < 2) {
      labels.set(workspace.workspaceId, base)
      return
    }
    const others: string[] = []
    for (const peer of group) {
      if (peer === index) continue
      const rival = workspaces[peer]
      if (rival !== undefined) others.push(rival.path)
    }
    const suffix = distinguishingSuffix(workspace.path, others)
    labels.set(workspace.workspaceId, suffix === null ? base : `${base} (${suffix})`)
  })
  return labels
}
