import type { WorkspaceUIProps } from '../contract/slots.ts';
/**
 * Render the browsing region.
 * @param props - composed slot props (shell owner share + store + injected actions).
 * @returns the region element tree.
 */
export declare function WorkspaceUI({ wide, usePanelInfo, expandSidebar, useSectionScroller, useSessions, useSessionStatus, useWorkspaces, useStore, actions, startSession, open, requestSessionRename, notifyArchivedNotOpenable, renameWorkspace, deleteWorkspace, insertWorkspaceBefore, unarchiveSession, createWorkspace, addFolder, removeFolder, setPrimaryFolder, searchSessions, searchResultLimit, useDirectoryFlow, useHostInfo, useShortcuts, useWorkspaceShortcuts, requestSearch, requestAddWorkspace, closeAddWorkspace, setDirectoryBusy, dismissForkError, openFolder, revealFolder, renderSlot, t, }: WorkspaceUIProps): import("react").JSX.Element;
//# sourceMappingURL=WorkspaceUI.d.ts.map