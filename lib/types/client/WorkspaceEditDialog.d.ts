import type { WorkspaceBrowserProps } from './contract/slots.ts';
/** The standard locale seat, prop-passed from the browser root. */
type EditTranslate = WorkspaceBrowserProps['t'];
/** Last path segment for a host directory; the full path stays on the title. */
export declare function folderLabel(path: string): string;
/**
 * Render the Edit project dialog.
 * @param props.open - whether the dialog is showing.
 * @param props.title - current display-name draft.
 * @param props.path - current primary directory in the draft.
 * @param props.folders - extra directories in the draft (not including path).
 * @param props.busy - Save / directory pick in flight; inputs disable.
 * @param props.error - host or conflict message under the form.
 * @param props.duplicateName - another Workspace already uses the trimmed title.
 * @param props.flowAvailable - directory-flow hole occupied; hides Add folder otherwise.
 * @param props.onTitleChange - display-name draft changed.
 * @param props.onClose - Cancel, Escape, or the header close control.
 * @param props.onSave - commit title, primary, and folder diffs.
 * @param props.onRemoveProject - leave the editor and confirm registration deletion.
 * @param props.onAddFolder - open the directory flow for one extra folder.
 * @param props.onRemoveFolder - drop one extra folder from the draft.
 * @param props.onSetPrimary - promote an extra folder in the draft.
 * @param props.t - workspace locale seat.
 * @returns the modal, or null while closed.
 */
export declare function WorkspaceEditDialog({ open, title, path, folders, busy, error, duplicateName, flowAvailable, onTitleChange, onClose, onSave, onRemoveProject, onAddFolder, onRemoveFolder, onSetPrimary, t, }: {
    open: boolean;
    title: string;
    path: string;
    folders: readonly string[];
    busy: boolean;
    error: string | null;
    duplicateName: boolean;
    flowAvailable: boolean;
    onTitleChange: (title: string) => void;
    onClose: () => void;
    onSave: () => void;
    onRemoveProject: () => void;
    onAddFolder: () => void;
    onRemoveFolder: (path: string) => void;
    onSetPrimary: (path: string) => void;
    t: EditTranslate;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=WorkspaceEditDialog.d.ts.map