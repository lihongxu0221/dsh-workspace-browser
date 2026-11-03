/**
 * Derives the workspace browser tree from caller-projected Workspace and
 * Session order. Unassigned Sessions trail under Ungrouped; only the selected
 * blank Session remains visible.
 */
import { type SessionListState, type SessionSearchResultItem } from '@deepseek-ai/dsh-api-session-controller/client';
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Group key for Sessions outside every Workspace. */
export declare const UNGROUPED_KEY = "";
/**
 * Resolve the Workspace browser group that owns one Session.
 * @param workspaces - authoritative Workspace membership.
 * @param sessionId - Session whose browser group is required.
 * @returns owning Workspace id, or {@link UNGROUPED_KEY} when no Workspace accounts for it.
 */
export declare function owningGroupKey(workspaces: readonly WorkspaceView[], sessionId: SessionId): string;
/** Primary directory plus extra source folders, without repeating the same path. */
export declare function workspaceSourcePaths(cwd: string | undefined, folders: readonly string[]): string[];
/** Compare directory paths the way the browser matches a Session cwd to a folder. */
export declare function samePath(a: string | undefined, b: string | undefined): boolean;
/**
 * Whether a Session records a root that has gone away.
 *
 * Only a *recorded* root the probe reports gone counts as missing. A Session
 * that records no cwd is not a dead root: the host resolves it to its own
 * default directory (`header.cwd ?? defaultDirectory`), so it keeps the
 * treatment it had before this guard existed.
 * @param cwd - the cwd a Session summary records, if any.
 * @param usable - existence probe for a recorded cwd.
 * @returns whether the Session is stranded on a missing root.
 */
export declare function missingRoot(cwd: string | undefined, usable: (path: string) => Promise<boolean>): Promise<boolean>;
/** Either the root a new Session starts in, or the refusal to report. */
export type SessionRoot = {
    readonly ok: true;
    readonly cwd: string;
} | {
    readonly ok: false;
    readonly error: string;
};
/**
 * The one root a new Session may start in, or the refusal to report.
 *
 * The effective primary folder is the only candidate: a folder that is neither
 * the primary nor listed among the workspace's folders was deliberately
 * removed, so it is never used as a root. A primary the probe reports gone is
 * refused instead of handed to the Host, whose Session creation would recreate
 * the deleted folder as an empty directory.
 * @param primary - the effective primary folder.
 * @param exists - whether the probe found an existing directory there.
 * @returns the cwd to use, or the sentence to throw.
 */
export declare function sessionRoot(primary: string, exists: boolean): SessionRoot;
/** What opening one conversation should do once the node half has answered. */
export type RerootAction = 'restored' | 'notice' | 'fallback';
/**
 * Read the node half's answer to one request to move a conversation off a dead root.
 *
 * `restored` - the conversation has a live root (it moved, or it was already
 * live); the caller may make it current. `notice` - the Workspace's primary
 * folder itself is gone, so report the same actionable sentence the create path
 * throws. `fallback` - no answer, or any other refusal: keep today's behaviour.
 * @param answer - the node half's answer, or undefined when it said nothing.
 * @returns which of the three outcomes the caller should take.
 */
export declare function rerootAction(answer: {
    readonly ok: boolean;
    readonly reason?: string;
} | undefined): RerootAction;
/**
 * The conversation a Session target names.
 *
 * A plain target is its own id; a durable direct-parent subagent address is the
 * child's own conversation, which has its own root and must be inspected on its
 * own (its parent's root says nothing about it).
 * @param target - the Session id or subagent address being revealed.
 * @returns the id of the conversation that target names.
 */
export declare function conversationId<T extends string>(target: T | {
    readonly childSessionId: T;
}): T;
/** Whether one Session cwd lies inside one of the given source folders. */
export declare function cwdInsideFolders(cwd: string | undefined, folders: readonly string[]): boolean;
/**
 * Fold this plugin's own source folders into the Workspace list the browser
 * derives from: their paths join `folders`, and Sessions the host left
 * ungrouped whose cwd lies inside one of them join that Workspace's
 * membership. The host owns membership for its own paths, so only unclaimed
 * Sessions are borrowed.
 * @param workspaces - Workspace views as the host reported them.
 * @param list - live Session list (each summary carries its cwd).
 * @param extraFolders - plugin-owned extra folders per Workspace id.
 * @param primaryByWorkspace - plugin-owned primary directory when it differs from the host path.
 * @returns the same views, with plugin folders and borrowed members folded in.
 */
export declare function mergePluginFolders<W extends ListedWorkspace>(workspaces: readonly W[], list: SessionListState, extraFolders: Readonly<Record<string, readonly string[]>> | undefined, primaryByWorkspace?: Readonly<Record<string, string>> | undefined): W[];
/** Pending interaction kinds with dedicated Workspace-row presentation. */
export type SessionPendingInteractionStatus = 'approval' | 'plan-review' | 'question';
type SessionStatuses = SessionStatusSnapshot;
/** One top-level session row in a group or the flat list. */
export interface SessionNode {
    id: SessionId;
    /** Stored title, or empty; the renderer localizes blank and unnamed row labels. */
    title: string;
    /** The provisional blank session (renderer shows the localized New Session title). */
    blank: boolean;
    /** A Session-scoped UI consumer is awaiting this user. */
    pendingInteraction?: SessionPendingInteractionStatus;
    running: boolean;
    /** Running direct children in the loaded subagent catalog. */
    runningSubagentCount: number;
    /** Finished running while not selected and not yet opened (the green "done" reminder dot). */
    completed: boolean;
    /** In the registry-global pin set: leads its section, reorderable only among pinned rows. */
    pinned: boolean;
    /** In the registry-global archive set: shown grayed in place and not openable. */
    archived: boolean;
    updatedAt: number;
}
/** Session order selected by the Workspace browser. */
export type SessionOrderBy = 'manual' | 'updated';
/** One workspace group section: header row facts + visible top-level session rows. */
export interface GroupNode {
    /** Group key: the workspace id or {@link UNGROUPED_KEY}. */
    key: string;
    /** Backing Workspace id; absent only for the ungrouped bucket. */
    workspaceId: WorkspaceId | undefined;
    cwd: string | undefined;
    /** Extra directories besides the primary path; empty for the ungrouped bucket. */
    folders: readonly string[];
    /** Workspace creation time (epoch ms); absent only for the ungrouped bucket. */
    createdAt: number | undefined;
    label: string;
    /** Total visible sessions in the group. */
    sessionCount: number;
    /** Title of the first visible non-blank session; empty means untitled. Absent when the group has none. */
    latestSessionTitle?: string;
    expanded: boolean;
    /** The group contains the selected session (active folder tint; supplied here so the renderer never scans). */
    containsCurrent: boolean;
    /** True when this Workspace sits in the browser-local pinned prefix. */
    pinned: boolean;
    /** Visible session rows (empty while the group is folded). */
    sessions: readonly SessionNode[];
}
/** One flat search row combining list metadata with an optional content match. */
export interface SearchResultNode {
    id: SessionId;
    title: string;
    workspace: string;
    /** A Session-scoped UI consumer is awaiting this user. */
    pendingInteraction?: SessionPendingInteractionStatus;
    running: boolean;
    /** Running direct children in the loaded subagent catalog. */
    runningSubagentCount: number;
    /** Finished running while not selected and not yet opened (the green "done" reminder dot). */
    completed: boolean;
    /** In the registry-global archive set: shown grayed and not openable. */
    archived: boolean;
    snippet?: string;
}
/** Bounded merged search projection plus the refine-query hint bit. */
export interface SearchResultSet {
    items: readonly SearchResultNode[];
    hasMore: boolean;
}
/** Viewing state consumed by the derivation. */
export interface TreeView {
    expandedGroups: readonly string[];
    /** Browser-local order for Sessions without a backing Workspace account. */
    ungroupedOrder?: readonly string[];
    /** Workspace ids kept at the front of the grouped list, in pin order. */
    pinnedWorkspaceIds?: readonly string[];
}
/** Workspace row plus extra folders the feed may project beside the typed view. */
export type ListedWorkspace = WorkspaceView & {
    readonly folders?: readonly string[];
};
/**
 * Directory display label: basename of the path (both separators accepted).
 * Ungrouped-bucket fallback for surfaces without a workspace title.
 * @param cwd - directory path, or undefined for the ungrouped bucket.
 * @returns basename, the raw cwd when it has no basename, or an empty ungrouped marker.
 */
export declare function workspaceLabel(cwd: string | undefined): string;
/**
 * Project known account members by current Session recency.
 * @param sessionIds - authoritative account membership.
 * @param summaries - current Session summaries; members without a summary are omitted until it arrives.
 * @returns known members newest first, with Session identity as the deterministic tie-break.
 */
export declare function orderByRecency(sessionIds: readonly SessionId[], summaries: SessionListState['byId']): SessionId[];
/**
 * Reconcile a browser-local manual order with current account membership.
 * New ordinary forks precede their sources without changing saved entries' relative order.
 * @param memberIds - authoritative account membership.
 * @param savedOrder - previously saved browser-local order.
 * @param summaries - current Session metadata; unknown new members wait for their summaries.
 * @param rowState - global pin and archive membership; only account members can supplement the order.
 * @returns saved relative positions plus missing members ordered by pin, fork source, recency, and archive status.
 */
export declare function reconcileManualOrder(memberIds: readonly SessionId[], savedOrder: readonly string[] | undefined, summaries: SessionListState['byId'], rowState?: Pick<SessionRowState, 'pinnedSessionIds' | 'archivedSessionIds'>): SessionId[];
/**
 * Keep the selected provisional New Session ahead of either base order.
 * @param order - recency or reconciled manual order.
 * @param currentBlank - selected blank Session in this account, when present.
 * @returns a copy with the selected blank first and no duplicate slot.
 */
export declare function pinCurrentBlank(order: readonly SessionId[], currentBlank: SessionId | undefined): SessionId[];
/**
 * Archived-row visibility choice: the default hides archived rows, `show`
 * mixes them into their kept slots, and `only` restricts the view (and
 * search) to archived rows.
 */
export type ArchivedFilter = 'default' | 'show' | 'only';
/** Registry-global row state consumed by every tree derivation. */
export interface SessionRowState {
    /** Registry-global pin ids; pinned rows lead their section in the local order. */
    pinnedSessionIds: readonly SessionId[];
    /** Archive set; members keep their slots and show grayed while visible. */
    archivedSessionIds: readonly SessionId[];
    /** Archived-row visibility choice applied to lists and search alike. */
    archivedFilter: ArchivedFilter;
}
/**
 * Derive the workspace browser groups with every session as a top-level row.
 *
 * Every group shows, except that the archived-only filter drops groups
 * without visible members; sessions populate under expanded groups with
 * pinned rows leading in the selected local order. Blank sessions are
 * excluded except for the selected provisional New Session row; archived
 * sessions keep their slots and appear per the archived filter. Content
 * search lives outside this derivation (see {@link deriveSearchResults}).
 * @param list - sessions list snapshot (`mainView` retention feeds containsCurrent).
 * @param workspaces - real Workspaces in Host group order with caller-projected Session order.
 * @param rowState - registry-global pin and archive sets plus the archived filter.
 * @param statuses - unified UI status by Session.
 * @param view - local expansion arrays.
 * @returns group sections in render order.
 */
export declare function deriveGroups(list: SessionListState, workspaces: readonly ListedWorkspace[], rowState: SessionRowState, statuses: SessionStatuses, view: TreeView): GroupNode[];
/**
 * Select complete flat-list membership, independently of archive visibility.
 * @param list - sessions list snapshot.
 * @returns known ordinary Session ids, including archives and only the current blank.
 */
export declare function sessionMemberIds(list: SessionListState): SessionId[];
/**
 * Select visible flat-list members without deriving row presentation or ordering.
 * @param list - sessions list snapshot.
 * @param archivedSessionIds - registry-global archive set.
 * @param archivedFilter - archived-row visibility choice.
 * @returns known visible Session ids in list order, including ordinary forks and only the current blank.
 */
export declare function visibleSessionIds(list: SessionListState, archivedSessionIds: readonly SessionId[], archivedFilter: ArchivedFilter): SessionId[];
/**
 * Derive flat rows from the browser's complete ordered Session ids, with
 * pinned rows fronted ahead of the supplied order.
 * @param list - sessions list snapshot used to select the ids.
 * @param sessionIds - complete account members in the selected order, including hidden archives.
 * @param rowState - registry-global pin and archive sets plus the archived filter.
 * @param statuses - unified UI status by Session.
 * @returns flat rows in sectioned order with current status indicators.
 */
export declare function deriveFlat(list: SessionListState, sessionIds: readonly SessionId[], rowState: SessionRowState, statuses: SessionStatuses): SessionNode[];
/**
 * Merge immediate title/Workspace substring matches with ranked Host content
 * matches. Local rows lead newest-first, content-only rows retain backend
 * order, and duplicate sessions receive the backend snippet in place.
 * @param list - session metadata authority.
 * @param workspaces - Workspace membership and display labels.
 * @param query - caller text; surrounding whitespace is ignored.
 * @param archivedSessionIds - registry-global archive set (members match per the archived filter).
 * @param archivedFilter - archived-row visibility choice; search follows it.
 * @param statuses - unified UI status by Session.
 * @param content - ranked Host content-search page.
 * @param limit - protocol-owned maximum merged row count.
 * @returns bounded deduplicated flat rows and a refine-query hint bit.
 */
export declare function deriveSearchResults(list: SessionListState, workspaces: readonly WorkspaceView[], query: string, archivedSessionIds: readonly SessionId[], archivedFilter: ArchivedFilter, statuses: SessionStatuses, content: {
    items: readonly SessionSearchResultItem[];
    hasMore: boolean;
}, limit: number): SearchResultSet;
/**
 * Find the nearest registered ancestor, excluding the Workspace directory itself.
 * Paths use Host spelling; matching is case-sensitive, like Workspace identity.
 * @param path - Workspace directory.
 * @param parents - registered Workspace directory paths.
 * @returns the owning parent path, or undefined when no parent contains the Workspace.
 */
export declare function owningParentFolder(path: string, parents: readonly string[]): string | undefined;
export {};
//# sourceMappingURL=tree.d.ts.map