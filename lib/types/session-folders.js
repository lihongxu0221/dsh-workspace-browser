/**
 * Source folders of the workspace a Session belongs to. The browser half keeps
 * the extra-folder layer; this half turns it into the sentence the Session's
 * prompt carries, because the shipped host registers neither the folders nor a
 * multi-root sandbox for them.
 */
import { normalizeDirectory, sameDirectory } from "./folder-layer.js";
/** Is `child` the directory `parent`, or a descendant of it? */
export function containsDirectory(parent, child) {
    const outer = normalizeDirectory(parent);
    const inner = normalizeDirectory(child);
    if (outer === '' || inner === '')
        return false;
    return inner === outer || inner.startsWith(`${outer}/`);
}
/** The workspace's effective primary: a promoted override wins over the host path. */
export function effectivePrimary(layer, workspace) {
    const promoted = layer.primaryByWorkspace[workspace.id];
    return promoted !== undefined && promoted !== '' ? promoted : workspace.path;
}
/** Every source folder of one workspace, primary first and deduplicated. */
export function workspaceSourceFolders(layer, workspace) {
    const out = [effectivePrimary(layer, workspace)];
    for (const folder of [...(workspace.folders ?? []), ...(layer.extraFoldersByWorkspace[workspace.id] ?? [])]) {
        if (!out.some(item => sameDirectory(item, folder)))
            out.push(folder);
    }
    return out;
}
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
export function selectWorkspace(layer, workspaces, session) {
    const id = session.id;
    if (id !== undefined && id !== '') {
        const member = workspaces.find(workspace => workspace.sessionIds.includes(id));
        if (member !== undefined)
            return member;
    }
    const cwd = session.header?.cwd;
    if (cwd === undefined || cwd === '')
        return undefined;
    const exact = workspaces.find(workspace => sameDirectory(effectivePrimary(layer, workspace), cwd) || sameDirectory(workspace.path, cwd));
    if (exact !== undefined)
        return exact;
    let match;
    let depth = -1;
    let tied = false;
    for (const workspace of workspaces) {
        for (const folder of workspaceSourceFolders(layer, workspace)) {
            if (!containsDirectory(folder, cwd))
                continue;
            const length = normalizeDirectory(folder).length;
            if (length > depth) {
                match = workspace;
                depth = length;
                tied = false;
            }
            else if (length === depth && match !== undefined && match !== workspace) {
                tied = true;
            }
        }
    }
    // Two Workspaces can own the same folder; the folder then names neither of them.
    return tied ? undefined : match;
}
/**
 * One prompt paragraph naming the workspace's source folders.
 * @param layer - the plugin's folder layer.
 * @param workspaces - workspace records the host registry holds.
 * @param session - the Session the prompt is being assembled for.
 * @returns the paragraph, or `''` when the Session has no extra folders.
 */
export function sourceFoldersContext(layer, workspaces, session) {
    const workspace = selectWorkspace(layer, workspaces, session);
    if (workspace === undefined)
        return '';
    const [primary, ...extras] = workspaceSourceFolders(layer, workspace);
    if (primary === undefined || extras.length === 0)
        return '';
    const listed = extras.map(folder => JSON.stringify(folder)).join(', ');
    return `The session workspace ${JSON.stringify(primary)} also includes these source folders: ${listed}. Reads may use all of them; writes stay inside the primary folder unless the file policy above allows more.`;
}
//# sourceMappingURL=session-folders.js.map