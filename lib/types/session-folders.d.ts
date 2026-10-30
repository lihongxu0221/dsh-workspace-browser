/**
 * Source folders of the workspace a Session belongs to. The browser half keeps
 * the extra-folder layer; this half turns it into the sentence the Session's
 * prompt carries, because the shipped host registers neither the folders nor a
 * multi-root sandbox for them.
 */
import { type FolderLayer } from './folder-layer.ts';
/** Workspace shape both the registry entity and the browser's projection satisfy. */
export interface WorkspaceRecord {
    readonly id: string;
    readonly path: string;
    readonly sessionIds: readonly string[];
    /** Folder projection of a host that owns the multi-folder feature itself. */
    readonly folders?: readonly string[];
}
/** The Session header fields this half reads. */
export interface SessionLike {
    readonly id?: string;
    readonly header?: {
        readonly cwd?: string;
    };
}
/** Is `child` the directory `parent`, or a descendant of it? */
export declare function containsDirectory(parent: string, child: string): boolean;
/** The workspace's effective primary: a promoted override wins over the host path. */
export declare function effectivePrimary(layer: FolderLayer, workspace: WorkspaceRecord): string;
/** Every source folder of one workspace, primary first and deduplicated. */
export declare function workspaceSourceFolders(layer: FolderLayer, workspace: WorkspaceRecord): string[];
/**
 * The workspace a Session belongs to: registry membership first, then an exact
 * cwd match, then the deepest folder containing the cwd. The last step is what
 * finds a Session started in a promoted folder — the host refuses to attach
 * such a Session to its workspace, so the registry never lists it.
 * @param layer - the plugin's folder layer.
 * @param workspaces - workspace records the host registry holds.
 * @param session - the Session the prompt is being assembled for.
 * @returns the matching workspace, or `undefined` when none owns the Session.
 */
export declare function selectWorkspace(layer: FolderLayer, workspaces: readonly WorkspaceRecord[], session: SessionLike): WorkspaceRecord | undefined;
/**
 * One prompt paragraph naming the workspace's source folders.
 * @param layer - the plugin's folder layer.
 * @param workspaces - workspace records the host registry holds.
 * @param session - the Session the prompt is being assembled for.
 * @returns the paragraph, or `''` when the Session has no extra folders.
 */
export declare function sourceFoldersContext(layer: FolderLayer, workspaces: readonly WorkspaceRecord[], session: SessionLike): string;
//# sourceMappingURL=session-folders.d.ts.map