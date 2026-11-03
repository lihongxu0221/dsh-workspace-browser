/** Workspace archive and directory UI capability. */
import { Service } from '@deepseek-ai/cordis';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { pinOrderAccounts, pinOrderSource } from "./pin-order.js";
import { conversationId, missingRoot, rerootAction, samePath, sessionRoot } from "./tree.js";
/** Authenticated route reporting whether a directory still exists. */
const DIRECTORY_ROUTE = '/api/workspace-browser/directory';
/** Authenticated route moving one conversation off a folder that is gone. */
const REROOT_ROUTE = '/api/workspace-browser/reroot';
/**
 * Whether `path` is still an existing directory. A missing path is the only
 * "no": when the probe itself fails (no node half, a transport error, an
 * unreadable parent) the answer is yes, so the browser keeps behaving as it
 * did before the probe rather than blocking the user.
 */
export async function directoryExists(path) {
    if (path === undefined || path === '')
        return false;
    try {
        const response = await fetch(`${DIRECTORY_ROUTE}?path=${encodeURIComponent(path)}`, {
            credentials: 'same-origin',
            cache: 'no-store',
        });
        if (!response.ok)
            return true;
        const body = await response.json();
        if (typeof body !== 'object' || body === null)
            return true;
        return body.exists !== false;
    }
    catch {
        return true;
    }
}
/**
 * Ask the node half to re-root one conversation, before it becomes current.
 *
 * Never throws and never guesses: an unreadable, unparsable, or absent answer
 * reads as no answer, which the caller treats as "keep today's behaviour".
 * @param sessionId - the conversation whose recorded folder is gone.
 * @returns the node half's answer, or undefined when it did not answer.
 */
async function rerootSession(sessionId) {
    try {
        const response = await fetch(REROOT_ROUTE, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });
        const body = await response.json();
        if (typeof body !== 'object' || body === null)
            return undefined;
        if (typeof body.ok !== 'boolean')
            return undefined;
        return body;
    }
    catch {
        return undefined;
    }
}
/** Structured directory failure exposed to directory UI consumers. */
export class DirectoryBrowseError extends Error {
    rpcError;
    name = 'DirectoryBrowseError';
    /** @param rpcError - Host directory business failure. */
    constructor(rpcError) {
        super(`directory browse failed: ${rpcError.code}: ${rpcError.message}`);
        this.rpcError = rpcError;
    }
}
/** Implements Workspace archive and directory UI operations. */
class UiWorkspaceService extends Service {
    directoryPicker;
    workspaces;
    sessions;
    view;
    notify;
    primaryOf;
    /** The latest in-flight connection per Workspace; a request joins it only when both name the same preset. */
    connecting = new Map();
    lifetime = new AbortController();
    selection = createSnapshotStore({}, { persist: { name: 'dsh.sessions.current' } });
    mainReference;
    /**
     * @param ctx - Client root Context.
     * @param directoryPicker - the directory-picking Remote namespace.
     * @param workspaces - pure Workspace Controller.
     * @param sessions - pure Session Controller.
     * @param view - the browser's viewing-store write set (one instance shared with its registration).
     * @param notify - show one notice through the Workspace notice channel.
     * @param primaryOf - plugin-promoted primary directory for a Workspace, when one is set.
     */
    constructor(ctx, directoryPicker, workspaces, sessions, view, notify, primaryOf) {
        super(ctx, 'uiWorkspace');
        this.directoryPicker = directoryPicker;
        this.workspaces = workspaces;
        this.sessions = sessions;
        this.view = view;
        this.notify = notify;
        this.primaryOf = primaryOf;
        ctx.effect(() => {
            const stop = this.watchNavigation();
            return () => {
                stop();
                this.lifetime.abort();
                const reference = this.mainReference;
                this.mainReference = undefined;
                reference?.release();
            };
        }, 'ui-workspace: Workspace navigation policy');
    }
    connectWorkspace(workspaceId, options = {}) {
        return this.connectBlank(workspaceId, options);
    }
    /**
     * @param reuse - preset for the reused or created blank. Absent reuses the first blank, same as an empty preset.
     */
    async connectBlank(workspaceId, reuse) {
        const workspace = this.workspaces.list.getSnapshot().items
            .find(item => item.workspaceId === workspaceId);
        if (workspace === undefined) {
            throw new Error(`uiWorkspace.connectWorkspace: unknown workspace ${workspaceId}`);
        }
        const preset = reuse ?? {};
        const inflight = this.connecting.get(workspaceId);
        if (inflight !== undefined && inflight.agentPreset === preset.agentPreset)
            return inflight.attempt;
        const attempt = this.createInWorkspace(workspace, preset).finally(() => {
            if (this.connecting.get(workspaceId)?.attempt === attempt)
                this.connecting.delete(workspaceId);
        });
        this.connecting.set(workspaceId, { agentPreset: preset.agentPreset, attempt });
        return attempt;
    }
    async createInWorkspace(workspace, options) {
        const primary = this.primaryOf(workspace.workspaceId) ?? workspace.path;
        // The effective primary folder is the only root a new Session may start in:
        // a folder that is neither the primary nor listed among the workspace's
        // folders was deliberately removed and is never used as a root. A primary
        // that is gone is refused outright — the host's own Session creation would
        // otherwise recreate the deleted folder as an empty directory.
        const root = sessionRoot(primary, await directoryExists(primary));
        if (!root.ok)
            throw new Error(root.error);
        const cwd = root.cwd;
        const hostPrimary = samePath(cwd, workspace.path);
        const archived = this.workspaces.list.getSnapshot().archivedSessionIds;
        const sessions = this.sessions.list.getSnapshot();
        // The host path is requested by Workspace id, which also attaches the
        // Session. A plugin-promoted folder is not that path: create accepts a cwd
        // on its own, and the browser borrows the Session back by that cwd.
        if (!hostPrimary) {
            for (const id of sessions.ids) {
                const summary = sessions.byId[id];
                if (summary === undefined || !summary.blank || !samePath(summary.cwd, cwd) || archived.includes(id))
                    continue;
                if (!blankAcceptsPreset(summary.projectionValues?.agentPreset, options.agentPreset))
                    continue;
                const claimedElsewhere = this.workspaces.list.getSnapshot().items.some(item => item.workspaceId !== workspace.workspaceId && item.sessionIds.includes(id));
                if (claimedElsewhere)
                    continue;
                return this.reuseBlankAt(cwd, id, options);
            }
            return this.sessions.create({ cwd, ...(options.agentPreset === undefined ? {} : { agentPreset: options.agentPreset }) });
        }
        const blank = sessions.ids.find((id) => {
            const summary = sessions.byId[id];
            return summary !== undefined && summary.blank && summary.cwd === workspace.path
                && workspace.sessionIds.includes(id) && !archived.includes(id)
                && blankAcceptsPreset(summary.projectionValues?.agentPreset, options.agentPreset);
        });
        return this.createNamed({
            workspaceId: workspace.workspaceId,
            ...(blank === undefined ? {} : { sessionId: blank }),
            ...(options.agentPreset === undefined ? {} : { agentPreset: options.agentPreset }),
        });
    }
    /**
     * Reuse a blank at a plugin-promoted cwd, or create a fresh Session there.
     * A named blank the Host declined may still read as blank from stale cached
     * list metadata, so its projections are reloaded like `createNamed` does.
     */
    async reuseBlankAt(cwd, sessionId, options = {}) {
        const preset = options.agentPreset === undefined ? {} : { agentPreset: options.agentPreset };
        let created;
        try {
            created = await this.sessions.create({ cwd, sessionId, ...preset });
        }
        catch (error) {
            if (sessionCreateErrorOf(error)?.rpcError.code !== 'session/writer-held')
                throw error;
            created = await this.sessions.create({ cwd, ...preset });
        }
        if (created !== sessionId) {
            void this.sessions.refreshProjections(sessionId).catch((reason) => {
                console.warn('declined blank Session projection reload failed:', reason);
            });
        }
        return created;
    }
    /**
     * Create through the Host. A named blank the Host declined may still read as
     * blank from stale cached list metadata, which hides it from the Session tree;
     * its projections are reloaded so the row reflects its log.
     */
    async createNamed(request) {
        const sessionId = await this.sessions.create(request);
        const named = request.sessionId;
        if (named !== undefined && named !== sessionId) {
            void this.sessions.refreshProjections(named).catch((reason) => {
                console.warn('declined blank Session projection reload failed:', reason);
            });
        }
        return sessionId;
    }
    /**
     * Reopen a saved blank Session under the preset its log recorded, or under
     * the Host default once that preset no longer activates. Listed values are
     * cached hints that can lag the log after an unclean Host exit, so the
     * Session's projections are reloaded before the preset is read; a Session
     * that still awaits a format migration reloads only those cached hints.
     */
    async restoreBlank(workspaceId, sessionId) {
        await this.sessions.refreshProjections(sessionId);
        const recorded = this.sessions.list.getSnapshot().byId[sessionId]?.projectionValues?.agentPreset;
        const request = { workspaceId, sessionId };
        if (typeof recorded !== 'string')
            return this.createNamed(request);
        try {
            return await this.createNamed({ ...request, agentPreset: recorded });
        }
        catch (error) {
            const code = sessionCreateErrorOf(error)?.rpcError.code;
            if (code !== 'agent-preset/not-found' && code !== 'agent-preset/invalid')
                throw error;
            return this.createNamed(request);
        }
    }
    openSession(target) {
        void this.openSessionSettled(target);
    }
    /**
     * Show one Session, re-rooting it first when its recorded folder is gone.
     *
     * The move has to finish before the conversation becomes current: the node
     * half appends the working-directory change, and the first turn must not
     * assemble on the dead root. A deliberate row click always reveals the
     * conversation, whatever the move answered — the user asked for it, so even a
     * failed attempt at the move must not keep them away from it.
     */
    async openSessionSettled(target) {
        try {
            await this.rerootDeadRoot(conversationId(target));
        }
        catch (error) {
            console.warn('the conversation was not re-rooted:', error);
        }
        this.replaceMain(target, this.lifetime.signal, 'reveal');
    }
    /**
     * Move one conversation off a folder that is gone, or report why not.
     *
     * A conversation whose recorded folder still exists is never touched. When
     * the Workspace's own primary folder is gone there is nowhere to move it, so
     * the same actionable notice the create path throws is raised instead.
     * `restored` also covers a conversation whose current root was already live.
     * @param sessionId - the conversation to inspect.
     * @returns whether the caller may make it current, must report a notice, or
     * should keep today's behaviour.
     */
    async rerootDeadRoot(sessionId) {
        const summary = this.sessions.list.getSnapshot().byId[sessionId];
        if (!(await missingRoot(summary?.cwd, directoryExists)))
            return 'restored';
        const answer = await rerootSession(sessionId);
        const action = rerootAction(answer);
        if (action === 'notice') {
            const primary = answer !== undefined && !answer.ok && answer.path !== undefined ? answer.path : '';
            const refusal = sessionRoot(primary, false);
            this.notify({
                kind: 'createFailed',
                message: refusal.ok ? 'the primary folder no longer exists' : refusal.error,
            });
        }
        else if (action === 'fallback') {
            const reason = answer === undefined ? 'no answer' : answer.ok ? 'already live' : answer.reason;
            console.warn('the conversation was not re-rooted:', reason);
        }
        return action;
    }
    openWorkspace(workspaceId, beforeOpen, options = {}) {
        return this.openWorkspaceSession(workspaceId, beforeOpen, options);
    }
    async openWorkspaceSession(workspaceId, beforeOpen, reuse) {
        const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
        let sessionId;
        try {
            sessionId = await this.connectBlank(workspaceId, reuse);
        }
        catch (error) {
            // Reported here, not in connectWorkspace: startup restoration calls that
            // directly and stays console-only.
            if (!navigation.aborted)
                this.notify({ kind: 'createFailed', message: creationFailureMessage(error) });
            throw error;
        }
        if (navigation.aborted)
            return;
        this.replaceMain(sessionId, navigation, 'reveal', beforeOpen);
    }
    async forkSession(sessionId, onCreated, options) {
        return this.sessions.fork({
            sessionId,
            increaseTitle: true,
            ...onCreated === undefined ? {} : { onCreated },
            ...options?.allowMigration === undefined ? {} : { allowMigration: options.allowMigration },
        });
    }
    startSession(workspaceId, options) {
        const { agentPreset, ...draft } = options ?? {};
        const draftOptions = options === undefined ? undefined : draft;
        const whenDraftExists = draftOptions?.whenDraftExists
            ?? (draftOptions?.clearPreviousDraft === true ? 'replace' : 'keep');
        const initializeDraft = draftOptions !== undefined
            && (draftOptions.prompt !== undefined || whenDraftExists === 'replace');
        const workspace = this.workspaces.list.getSnapshot();
        const sessions = this.sessions.list.getSnapshot();
        const current = this.mainReference?.sessionId;
        const currentWorkspaceId = current === undefined
            ? undefined
            : workspace.items.find(item => item.sessionIds.includes(current))?.workspaceId;
        const recent = workspace.phase === 'ready' && sessions.phase === 'ready'
            ? recentWorkspace(workspace.items, sessions.byId)
            : undefined;
        const target = workspaceId ?? currentWorkspaceId ?? recent;
        if (target === undefined) {
            if (initializeDraft) {
                this.notify({ kind: 'createFailed', message: this.ctx.locale.bind('workspace')('draft.workspaceRequired') });
                return;
            }
            this.clearMain();
            return;
        }
        const prepare = initializeDraft && draftOptions !== undefined
            ? (id) => {
                const binding = this.sessions.binding(id);
                if (binding === undefined)
                    this.draftPreparationFailed();
                this.prepareDraft(binding, draftOptions);
            }
            : undefined;
        void this.openWorkspace(target, prepare, agentPreset === undefined ? {} : { agentPreset }).catch((reason) => { console.warn('new session failed:', reason); });
    }
    prepareDraft(binding, options) {
        const conversation = this.ctx.get('conversation');
        if (conversation === undefined)
            this.draftPreparationFailed();
        if (conversation.input.requestDraftInitialization(binding, options) === 'blocked')
            this.draftPreparationFailed();
    }
    draftPreparationFailed() {
        const message = this.ctx.locale.bind('workspace')('draft.initializationFailed');
        this.notify({ kind: 'createFailed', message });
        throw new Error(message);
    }
    async archiveSession(sessionId, options = {}) {
        await this.workspaces.archiveSession(sessionId, options);
        if (this.mainReference?.sessionId === sessionId)
            this.clearMain();
    }
    async unarchiveSession(sessionId) {
        await this.workspaces.unarchiveSession(sessionId);
    }
    async pinSession(sessionId) {
        await this.workspaces.pinSession(sessionId);
        const { items, pinnedSessionIds, archivedSessionIds } = this.workspaces.list.getSnapshot();
        this.view.pinSessionOrder(sessionId, pinOrderAccounts(items, sessionId), pinOrderSource(items, this.sessions.list.getSnapshot(), { pinnedSessionIds, archivedSessionIds }));
    }
    async unpinSession(sessionId) {
        await this.workspaces.unpinSession(sessionId);
    }
    async pickDirectory() {
        const result = await this.directoryPicker.pick();
        if (!result.ok)
            throw new Error(`directory picker failed: ${result.error.message}`);
        return result.value;
    }
    async listDirectory(path, signal) {
        const result = await this.directoryPicker.list(path, signal);
        if (!result.ok)
            throw new DirectoryBrowseError(result.error);
        return result.value;
    }
    async createDirectory(path, name) {
        const result = await this.directoryPicker.createDirectory(path, name);
        if (!result.ok)
            throw new DirectoryBrowseError(result.error);
        return result.value;
    }
    watchNavigation() {
        let initial = 'waiting';
        const reconcile = () => {
            if (this.lifetime.signal.aborted)
                return;
            if (this.clearArchivedCurrent())
                return;
            if (initial !== 'waiting')
                return;
            const workspace = this.workspaces.list.getSnapshot();
            const sessions = this.sessions.list.getSnapshot();
            if (workspace.phase !== 'ready' || sessions.phase !== 'ready')
                return;
            if (this.mainReference !== undefined) {
                initial = 'done';
                return;
            }
            initial = 'connecting';
            void this.restoreSelection(workspace, sessions).then(() => { initial = 'done'; }, (reason) => {
                if (this.lifetime.signal.aborted)
                    return;
                initial = 'waiting';
                console.warn('initial Session restoration failed:', reason);
            });
        };
        const disposeWorkspaces = this.workspaces.list.subscribe(reconcile);
        const disposeSessions = this.sessions.list.subscribe(reconcile);
        reconcile();
        return () => {
            this.lifetime.abort();
            disposeSessions();
            disposeWorkspaces();
        };
    }
    async restoreSelection(workspaces, sessions) {
        const saved = this.selection.getSnapshot();
        if (saved.subagentAddress !== undefined) {
            // A persisted child conversation has its own recorded root: inspect and
            // move the child, not its parent. Whatever that answers, the conversation
            // is still revealed — the selection is what the user last had open.
            try {
                await this.rerootDeadRoot(conversationId(saved.subagentAddress));
            }
            catch (error) {
                console.warn('the conversation was not re-rooted:', error);
            }
            this.replaceMain(saved.subagentAddress, this.lifetime.signal, 'preserve');
            return;
        }
        const summary = saved.sessionId === undefined ? undefined : sessions.byId[saved.sessionId];
        const workspace = summary === undefined ? undefined
            : workspaces.items.find(item => item.sessionIds.includes(summary.id));
        // A Session whose recorded folder no longer exists must not be restored
        // into that dead root: every cwd-rooted host consumer (file index, sandbox)
        // fails there. The node half moves such a conversation onto the Workspace's
        // primary before it becomes current, which keeps the conversation usable and
        // leaves nothing deleted. When there is nowhere to move it, the create path
        // below takes over and reports the missing primary. A Session that records
        // no cwd at all is not stale: the host still resolves it to its own default
        // directory, so it is restored as before.
        const stale = summary !== undefined && await missingRoot(summary.cwd, directoryExists);
        if (summary !== undefined && (!summary.blank || workspace === undefined)) {
            if (!stale) {
                this.replaceMain(summary.id, this.lifetime.signal, 'preserve');
                return;
            }
            if (await this.rerootDeadRoot(summary.id) === 'restored') {
                this.replaceMain(summary.id, this.lifetime.signal, 'preserve');
                return;
            }
        }
        const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
        let sessionId;
        if (!stale && summary !== undefined && workspace !== undefined && summary.cwd === workspace.path
            && !workspaces.archivedSessionIds.includes(summary.id)) {
            sessionId = await this.restoreBlank(workspace.workspaceId, summary.id);
        }
        let target = workspace?.workspaceId ?? recentWorkspace(workspaces.items, sessions.byId);
        if (target === undefined && workspaces.items.length === 0 && sessions.ids.length === 0) {
            const prepared = await this.initializeDefaultWorkspace(navigation);
            if (navigation.aborted)
                return;
            target = prepared?.workspaceId;
        }
        if (sessionId === undefined && target !== undefined)
            sessionId = await this.connectWorkspace(target);
        if (sessionId !== undefined && !navigation.aborted) {
            this.replaceMain(sessionId, navigation, 'preserve');
        }
    }
    async initializeDefaultWorkspace(signal) {
        try {
            return await this.workspaces.initializeDefault(signal);
        }
        catch (_error) {
            if (!signal.aborted)
                this.notify({ kind: 'defaultWorkspaceFailed' });
            return undefined;
        }
    }
    /** @returns true when an archived current selection was cleared. */
    clearArchivedCurrent() {
        const current = this.mainReference?.sessionId;
        if (current === undefined
            || !this.workspaces.list.getSnapshot().archivedSessionIds.includes(current))
            return false;
        this.clearMain();
        return true;
    }
    clearMain() {
        const previous = this.mainReference;
        this.mainReference = undefined;
        this.selection.set({});
        previous?.release();
        this.ctx.layout.selectPanel(null);
    }
    replaceMain(target, signal, panel, beforeOpen) {
        signal.throwIfAborted();
        const reference = this.sessions.retain(target, { source: 'mainView' });
        try {
            signal.throwIfAborted();
            beforeOpen?.(reference.sessionId);
            if (signal.aborted) {
                reference.release();
                return;
            }
            const subagentAddress = typeof target === 'string'
                ? this.sessions.subagentAddress(reference.sessionId)
                : target;
            this.selection.set({
                sessionId: reference.sessionId,
                ...(subagentAddress === undefined ? {} : { subagentAddress }),
            });
        }
        catch (error) {
            reference.release();
            throw error;
        }
        const previous = this.mainReference;
        this.mainReference = reference;
        previous?.release();
        if (panel === 'reveal')
            this.ctx.layout.selectPanel(null);
    }
}
/** A requested preset skips a blank that already lists a different preset. */
function blankAcceptsPreset(listed, requested) {
    return requested === undefined || typeof listed !== 'string' || listed === requested;
}
/**
 * `error` as the Session Controller's creation failure, or undefined when it
 * is not one. Client plugin bundles do not share error-class identity, so the
 * name decides.
 */
function sessionCreateErrorOf(error) {
    return error instanceof Error && error.name === 'SessionCreateError' ? error : undefined;
}
/**
 * The words a failed Session creation is reported in: a Host refusal keeps its
 * stable code and message; any other failure keeps its own message.
 */
function creationFailureMessage(error) {
    const refused = sessionCreateErrorOf(error);
    if (refused !== undefined)
        return `${refused.rpcError.code}: ${refused.rpcError.message}`;
    return error instanceof Error ? error.message : String(error);
}
/** Stable tie-breaking follows Host Workspace order. */
function recentWorkspace(workspaces, sessions) {
    let selected;
    let selectedTime = Number.NEGATIVE_INFINITY;
    for (const workspace of workspaces) {
        let latest = Number.NEGATIVE_INFINITY;
        for (const sessionId of workspace.sessionIds) {
            const session = sessions[sessionId];
            if (session !== undefined)
                latest = Math.max(latest, session.updatedAt);
        }
        if (latest === Number.NEGATIVE_INFINITY)
            latest = Date.parse(workspace.createdAt);
        if (selected === undefined || latest > selectedTime) {
            selected = workspace.workspaceId;
            selectedTime = latest;
        }
    }
    return selected;
}
export { UiWorkspaceService };
//# sourceMappingURL=navigation.js.map