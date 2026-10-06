/**
 * The workspace browser's viewing store: the session-list grouping mode,
 * persisted across reloads. Module level exports the factory only (a
 * module-level handle would pin the store identity across plugin reloads);
 * register() receives the factory and the browser derives its PropsStore
 * share from the return type.
 */
import { defineStore } from '@deepseek-ai/dsh-client-store';
import { reconcileManualOrder, samePath } from "./tree.js";
/** Browser-local order account for the hierarchy-free flat Session list. */
export const FLAT_SESSION_ORDER_KEY = '__flat_session_order__';
/** Copy read-only projections into the persisted mutable store representation. */
function copySessionOrders(orders) {
    return Object.fromEntries(Object.entries(orders).map(([key, order]) => [key, [...order]]));
}
/**
 * Create the workspace browser viewing store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createWorkspaceViewStore() {
    return defineStore({
        init: () => ({
            groupBy: 'workspace',
            orderBy: 'updated',
            groupExpansion: {},
            sessionOrderByAccount: {},
            archivedFilter: 'default',
            pinnedWorkspaceIds: [],
            workspacesOpen: true,
            recentsOpen: true,
            extraFoldersByWorkspace: {},
            primaryByWorkspace: {},
        }),
        persist: 'dsh.workspace.view.v5',
        actions: {
            setGroupBy: (d, mode) => { d.groupBy = mode; },
            setOrderBy: (d, mode, initialOrders) => {
                if (mode === d.orderBy)
                    return;
                d.sessionOrderByAccount = mode === 'manual' ? copySessionOrders(initialOrders) : {};
                d.orderBy = mode;
            },
            setGroupExpanded: (d, key, expanded) => { d.groupExpansion[key] = expanded; },
            retainAccountKeys: (d, workspaceKeys) => {
                const retained = new Set(workspaceKeys);
                d.groupExpansion = Object.fromEntries(Object.entries(d.groupExpansion).filter(([key]) => retained.has(key)));
                d.sessionOrderByAccount = Object.fromEntries(Object.entries(d.sessionOrderByAccount).filter(([key]) => retained.has(key)));
                delete d.sessionUpdatedAtByAccount;
                const pinned = Array.isArray(d.pinnedWorkspaceIds) ? d.pinnedWorkspaceIds : [];
                d.pinnedWorkspaceIds = pinned.filter(id => retained.has(id));
                if (typeof d.workspacesOpen !== 'boolean')
                    d.workspacesOpen = true;
                if (typeof d.recentsOpen !== 'boolean')
                    d.recentsOpen = true;
                // Pre-folder snapshots carry neither map; read them as empty rather than
                // migrating or dropping the rest of the viewing state. Keep the caller's
                // object identity when nothing is pruned: a retain pass must not look
                // like a state change to store subscribers.
                const extra = d.extraFoldersByWorkspace ?? {};
                const extraRetained = Object.entries(extra).filter(([key]) => retained.has(key));
                if (extraRetained.length !== Object.keys(extra).length)
                    d.extraFoldersByWorkspace = Object.fromEntries(extraRetained);
                else
                    d.extraFoldersByWorkspace = extra;
                const primary = d.primaryByWorkspace ?? {};
                const primaryRetained = Object.entries(primary).filter(([key]) => retained.has(key));
                if (primaryRetained.length !== Object.keys(primary).length)
                    d.primaryByWorkspace = Object.fromEntries(primaryRetained);
                else
                    d.primaryByWorkspace = primary;
            },
            syncSessionOrders: (d, orders) => {
                if (d.orderBy !== 'manual')
                    return;
                Object.assign(d.sessionOrderByAccount, copySessionOrders(orders));
            },
            setSessionOrder: (d, accountKey, order, initialOrders) => {
                if (d.orderBy === 'updated')
                    d.sessionOrderByAccount = copySessionOrders(initialOrders);
                else
                    Object.assign(d.sessionOrderByAccount, copySessionOrders(initialOrders));
                d.orderBy = 'manual';
                d.sessionOrderByAccount[accountKey] = [...order];
            },
            pinSessionOrder: (d, sessionId, accountKeys, source) => {
                const selected = new Set(accountKeys);
                d.sessionOrderByAccount = Object.fromEntries(Object.entries(source.members).map(([key, members]) => {
                    const order = reconcileManualOrder(members, d.sessionOrderByAccount[key], source.summaries, source.rowState);
                    return [key, selected.has(key) ? [sessionId, ...order.filter(id => id !== sessionId)] : order];
                }));
            },
            setArchivedFilter: (d, filter) => { d.archivedFilter = filter; },
            pinWorkspace: (d, workspaceId) => {
                const pinned = Array.isArray(d.pinnedWorkspaceIds) ? d.pinnedWorkspaceIds : [];
                if (pinned.includes(workspaceId))
                    return;
                d.pinnedWorkspaceIds = [...pinned, workspaceId];
            },
            unpinWorkspace: (d, workspaceId) => {
                const pinned = Array.isArray(d.pinnedWorkspaceIds) ? d.pinnedWorkspaceIds : [];
                d.pinnedWorkspaceIds = pinned.filter(id => id !== workspaceId);
            },
            setWorkspacesOpen: (d, open) => { d.workspacesOpen = open; },
            setRecentsOpen: (d, open) => { d.recentsOpen = open; },
            addExtraFolder: (d, workspaceId, path) => {
                const folders = d.extraFoldersByWorkspace?.[workspaceId] ?? [];
                if (folders.some(folder => samePath(folder, path)))
                    return;
                if (samePath(d.primaryByWorkspace?.[workspaceId], path))
                    return;
                d.extraFoldersByWorkspace = { ...d.extraFoldersByWorkspace, [workspaceId]: [...folders, path] };
            },
            removeExtraFolder: (d, workspaceId, path) => {
                const folders = d.extraFoldersByWorkspace?.[workspaceId] ?? [];
                const remaining = folders.filter(folder => !samePath(folder, path));
                const byWorkspace = { ...d.extraFoldersByWorkspace };
                if (remaining.length === 0)
                    delete byWorkspace[workspaceId];
                else
                    byWorkspace[workspaceId] = remaining;
                d.extraFoldersByWorkspace = byWorkspace;
            },
            promotePrimary: (d, workspaceId, path, hostPath) => {
                const extras = d.extraFoldersByWorkspace?.[workspaceId] ?? [];
                const current = d.primaryByWorkspace?.[workspaceId];
                const effective = current !== undefined && !samePath(current, hostPath) ? current : hostPath;
                if (samePath(path, effective))
                    return;
                let nextExtras = extras.filter(folder => !samePath(folder, path));
                const primary = { ...(d.primaryByWorkspace ?? {}) };
                if (samePath(path, hostPath)) {
                    if (!samePath(effective, hostPath) && !nextExtras.some(folder => samePath(folder, effective))) {
                        nextExtras = [...nextExtras, effective];
                    }
                    delete primary[workspaceId];
                }
                else {
                    if (!nextExtras.some(folder => samePath(folder, effective)))
                        nextExtras = [...nextExtras, effective];
                    primary[workspaceId] = path;
                }
                d.primaryByWorkspace = primary;
                const byWorkspace = { ...d.extraFoldersByWorkspace };
                if (nextExtras.length === 0)
                    delete byWorkspace[workspaceId];
                else
                    byWorkspace[workspaceId] = nextExtras;
                d.extraFoldersByWorkspace = byWorkspace;
            },
            installFolderLayer: (d, layer) => {
                d.extraFoldersByWorkspace = layer.extraFoldersByWorkspace;
                d.primaryByWorkspace = layer.primaryByWorkspace;
            },
        },
    });
}
//# sourceMappingURL=stores.js.map