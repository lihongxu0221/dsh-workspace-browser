import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Browser-owned project editor: display title, source folders, and
 * removal of the Workspace registration. Folder add/remove and primary
 * stay local until Save.
 */
import { Button, IconCloseOutline16, IconFolderClose16, IconProjectAddOutline16, Input, Modal, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './WorkspaceEditDialog.module.css';
/** Last path segment for a host directory; the full path stays on the title. */
export function folderLabel(path) {
    const trimmed = path.replace(/[\\/]+$/, '');
    const parts = trimmed.split(/[\\/]/);
    return parts[parts.length - 1] || path;
}
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
export function WorkspaceEditDialog({ open, title, path, folders, busy, error, duplicateName, flowAvailable, onTitleChange, onClose, onSave, onRemoveProject, onAddFolder, onRemoveFolder, onSetPrimary, t, }) {
    const trimmed = title.trim();
    const saveBlocked = busy || trimmed === '' || duplicateName;
    return (_jsxs(Modal, { open: open, onClose: onClose, closeLabel: t('close'), title: t('edit.project.title'), ...(css.card === undefined ? {} : { className: css.card }), footer: (_jsxs("div", { className: css.footer, children: [_jsx(Button, { variant: "outline", className: css.removeProject, disabled: busy, onClick: onRemoveProject, children: t('edit.project.remove') }), _jsxs("span", { className: css.footerActions, children: [_jsx(Button, { variant: "outline", disabled: busy, onClick: onClose, children: t('cancel') }), _jsx(Button, { variant: "primary", disabled: saveBlocked, onClick: onSave, children: t('save') })] })] })), children: [_jsx(Input, { icon: _jsx(IconFolderClose16, {}), ...(css.name === undefined ? {} : { className: css.name }), value: title, "aria-label": t('field.projectName'), autoFocus: true, disabled: busy, onFocus: (e) => { e.target.select(); }, onChange: (e) => { onTitleChange(e.target.value); }, onKeyDown: (e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        if (!saveBlocked)
                            onSave();
                    }
                } }), _jsx("div", { className: css.section, children: t('edit.project.sources') }), _jsxs("ul", { className: css.folders, children: [_jsxs("li", { className: css.folderRow, children: [_jsx(IconFolderClose16, {}), _jsx("span", { className: css.folderName, title: path, children: folderLabel(path) }), _jsx("span", { className: css.primary, children: t('edit.project.primary') }), _jsx("button", { type: "button", className: css.removeFolder, "aria-label": t('edit.project.removeFolder.aria', { name: folderLabel(path) }), disabled: true, children: _jsx(IconCloseOutline16, { size: 14 }) })] }), folders.map(folder => (_jsxs("li", { className: css.folderRow, children: [_jsx(IconFolderClose16, {}), _jsx("span", { className: css.folderName, title: folder, children: folderLabel(folder) }), _jsx("button", { type: "button", className: css.setPrimary, disabled: busy, onClick: () => { onSetPrimary(folder); }, children: t('edit.project.setPrimary') }), _jsx("button", { type: "button", className: css.removeFolder, "aria-label": t('edit.project.removeFolder.aria', { name: folderLabel(folder) }), disabled: busy, onClick: () => { onRemoveFolder(folder); }, children: _jsx(IconCloseOutline16, { size: 14 }) })] }, folder)))] }), flowAvailable && (_jsxs("button", { type: "button", className: css.addFolder, disabled: busy, onClick: onAddFolder, children: [_jsx(IconProjectAddOutline16, {}), t('edit.project.addFolder')] })), duplicateName && (_jsx("div", { className: css.error, role: "alert", children: t('conflict.named', { name: trimmed }) })), error !== null && _jsx("div", { className: css.error, role: "alert", children: error }), busy && _jsx("div", { className: css.status, role: "status", children: t('edit.project.saving') })] }));
}
//# sourceMappingURL=WorkspaceEditDialog.js.map