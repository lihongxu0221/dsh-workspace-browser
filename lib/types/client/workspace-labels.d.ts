/**
 * Picker labels for Workspace rows. A row is labelled with its display title
 * unless several Workspaces share that title: those rows then carry the
 * shortest trailing path segments that tell them apart, so two projects both
 * called `app` stay distinguishable without widening every row to a full path.
 */
/** The slice of a Workspace row these labels need. */
export interface WorkspaceLabelSource {
    readonly workspaceId: string;
    readonly path: string;
}
/**
 * Shortest trailing segments of `path` that no rival path shares.
 * @param path - the Workspace directory being labelled.
 * @param others - directories of the Workspaces sharing its display title.
 * @returns the joined suffix, or null when no suffix length distinguishes it
 * (identical paths, or a path with no segments at all).
 */
export declare function distinguishingSuffix(path: string, others: readonly string[]): string | null;
/**
 * Label every row of a Workspace list for the picker.
 * @param workspaces - rows in menu order.
 * @param baseLabel - the row's ordinary display title.
 * @returns workspace id to label; colliding titles gain a `(suffix)` tail.
 */
export declare function workspaceMenuLabels<T extends WorkspaceLabelSource>(workspaces: readonly T[], baseLabel: (workspace: T) => string): ReadonlyMap<string, string>;
//# sourceMappingURL=workspace-labels.d.ts.map