/** The two plugin-owned folder maps, in the shape the store persists them. */
export interface FolderMaps {
    readonly extraFoldersByWorkspace: Readonly<Record<string, readonly string[]>>;
    /** Absent in a pre-folder snapshot, like the store field it mirrors. */
    readonly primaryByWorkspace?: Readonly<Record<string, string>>;
}
/**
 * Register one extra source folder for a Workspace.
 * @returns the same map when the folder is already listed or already primary.
 */
export declare function addExtraFolderTo(maps: FolderMaps, workspaceId: string, path: string): Readonly<Record<string, readonly string[]>>;
/**
 * Drop one extra source folder.
 * @returns the map without the folder, dropping the Workspace key when nothing remains.
 */
export declare function removeExtraFolderFrom(maps: FolderMaps, workspaceId: string, path: string): Readonly<Record<string, readonly string[]>>;
/**
 * Promote `path` to the plugin-owned primary. The previous effective directory
 * becomes an extra folder so Sessions left there stay grouped; promoting the
 * host path itself hands the primary back to the host and lifts the promoted
 * folder into extras.
 * @returns both maps, or `maps` verbatim when the promotion changes nothing.
 */
export declare function promotePrimaryIn(maps: FolderMaps, workspaceId: string, path: string, hostPath: string): FolderMaps;
//# sourceMappingURL=folder-transition.d.ts.map