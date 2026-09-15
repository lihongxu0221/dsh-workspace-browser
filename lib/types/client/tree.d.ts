/**
 * Derives the workspace browser tree from caller-projected Workspace and
 * Session order. Unassigned Sessions trail under Ungrouped; only the selected
 * blank Session remains visible.
 */
import { type SessionListState, type SessionSearchResultItem } from '@deepseek-ai/dsh-api-session-controller/client';
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionPendingInteractionBase } from '@deepseek-ai/dsh-client-ui-session/client';
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
/** Pending interaction kinds with dedicated Workspace-row presentation. */
export type SessionPendingInteractionStatus = 'approval' | 'plan-review' | 'question';
type SessionPendingInteractions = ReadonlyMap<SessionId, SessionPendingInteractionBase>;
/** One top-level session row in a group or the flat list. */
export interface SessionNode {
    id: SessionId;
    /** Stored display title; the renderer substitutes the localized New Session label for blank rows. */
    title: string;
    /** The provisional blank session (renderer shows the localized New Session title). */
    blank: boolean;
    /** A Session-scoped UI consumer is awaiting this user. */
    pendingInteraction?: SessionPendingInteractionStatus;
    running: boolean;
    /** Running descendants connected through uninterrupted subagent-origin lineage. */
    runningSubagentCount: number;
    /** Finished running while not selected and not yet opened (the green "done" reminder dot). */
    completed: boolean;
    /** The current list projection contains at least one active Schedule record. */
    hasActiveSchedule: boolean;
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
    /** Extra directories besides {@link cwd}; empty for the ungrouped bucket. */
    folders: readonly string[];
    /** Workspace creation time (epoch ms); absent only for the ungrouped bucket. */
    createdAt: number | undefined;
    label: string;
    /** Total visible sessions in the group. */
    sessionCount: number;
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
    /** Running descendants connected through uninterrupted subagent-origin lineage. */
    runningSubagentCount: number;
    /** Finished running while not selected and not yet opened (the green "done" reminder dot). */
    completed: boolean;
    /** The current list projection contains at least one active Schedule record. */
    hasActiveSchedule: boolean;
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
 * @param memberIds - authoritative account membership.
 * @param savedOrder - previously saved browser-local order.
 * @param summaries - current Session summaries used to append newly known members by recency.
 * @returns retained saved slots followed by newly known members; departed members and unknown new members are omitted.
 */
export declare function reconcileManualOrder(memberIds: readonly SessionId[], savedOrder: readonly string[] | undefined, summaries: SessionListState['byId']): SessionId[];
/**
 * Keep the selected provisional New Session ahead of either base order.
 * @param order - recency or reconciled manual order.
 * @param currentBlank - selected blank Session in this account, when present.
 * @returns a copy with the selected blank first and no duplicate slot.
 */
export declare function pinCurrentBlank(order: readonly SessionId[], currentBlank: SessionId | undefined): SessionId[];
/**
 * Derive the workspace browser groups with every session as a top-level row.
 *
 * Every group shows; sessions populate under expanded groups in the selected
 * local order. Blank sessions are excluded except for the selected
 * provisional New Session row; archived sessions are excluded everywhere.
 * Content search lives outside this derivation
 * (see {@link deriveSearchResults}).
 * @param list - sessions list snapshot (`current` feeds containsCurrent).
 * @param workspaces - real Workspaces in Host group order with caller-projected Session order.
 * @param archivedSessionIds - registry-global archive set.
 * @param pendingInteractions - pending UI interactions by Session.
 * @param view - local expansion arrays.
 * @returns group sections in render order.
 */
export declare function deriveGroups(list: SessionListState, workspaces: readonly WorkspaceView[], archivedSessionIds: readonly SessionId[], pendingInteractions: SessionPendingInteractions, view: TreeView): GroupNode[];
/**
 * Select flat-list members without deriving row presentation or ordering.
 * @param list - sessions list snapshot.
 * @param archivedSessionIds - registry-global archive set.
 * @returns known visible Session ids in list order, including ordinary forks and only the current blank.
 */
export declare function visibleSessionIds(list: SessionListState, archivedSessionIds: readonly SessionId[]): SessionId[];
/**
 * Derive flat rows from the browser's ordered visible Session ids.
 * @param list - sessions list snapshot used to select the ids.
 * @param sessionIds - known visible members in render order, including any pinned blank.
 * @param pendingInteractions - pending UI interactions by Session.
 * @returns flat rows in the supplied order with current status indicators.
 */
export declare function deriveFlat(list: SessionListState, sessionIds: readonly SessionId[], pendingInteractions: SessionPendingInteractions): SessionNode[];
/**
 * Merge immediate title/Workspace substring matches with ranked Host content
 * matches. Local rows lead newest-first, content-only rows retain backend
 * order, and duplicate sessions receive the backend snippet in place.
 * @param list - session metadata authority.
 * @param workspaces - Workspace membership and display labels.
 * @param query - caller text; surrounding whitespace is ignored.
 * @param archivedSessionIds - registry-global archive set (members never match).
 * @param pendingInteractions - pending UI interactions by Session.
 * @param content - ranked Host content-search page.
 * @param limit - protocol-owned maximum merged row count.
 * @returns bounded deduplicated flat rows and a refine-query hint bit.
 */
export declare function deriveSearchResults(list: SessionListState, workspaces: readonly WorkspaceView[], query: string, archivedSessionIds: readonly SessionId[], pendingInteractions: SessionPendingInteractions, content: {
    items: readonly SessionSearchResultItem[];
    hasMore: boolean;
}, limit: number): SearchResultSet;
export {};
//# sourceMappingURL=tree.d.ts.map