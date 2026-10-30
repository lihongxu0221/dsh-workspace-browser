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
 * Normalize a directory for comparison: forward slashes, no trailing slash, and
 * a lowercased drive letter (Windows paths are case-insensitive).
 * @param path - Raw directory path.
 * @returns the comparable form.
 */
export declare function normalizeDirectory(path: string): string;
/** Are two directory paths the same directory? */
export declare function sameDirectory(a: string, b: string): boolean;
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