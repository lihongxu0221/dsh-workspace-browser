/** Folder list that travels with a copied `.dsh` home, not with browser localStorage. */
/** Plugin-owned source folders and promoted primaries, keyed by workspace id. */
export interface FolderLayer {
    extraFoldersByWorkspace: Record<string, string[]>;
    primaryByWorkspace: Record<string, string>;
}
/** Empty layer. */
export declare function emptyFolderLayer(): FolderLayer;
/** Read one persisted layer. Malformed input becomes empty rather than throwing. */
export declare function parseFolderLayer(raw: string): FolderLayer;
/**
 * Combine the browser's local layer with the file copied inside `.dsh`.
 * A primary already chosen on this browser wins; otherwise the file's does.
 * @param local - layer already in the viewing store.
 * @param file - layer read from the home file.
 * @returns the combined layer and whether it differs from `local`.
 */
export declare function mergeFolderLayer(local: FolderLayer, file: FolderLayer): {
    layer: FolderLayer;
    changed: boolean;
};
//# sourceMappingURL=folder-layer.d.ts.map