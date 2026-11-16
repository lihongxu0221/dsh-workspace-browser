import { hasDraftAttachments } from "./draft-attachments.js";
/** 跟随当前会话的原草稿状态，覆盖输入、粘贴、历史召回和任务预填。 */
export function createDraftPresenceSource(selection, resolve) {
    return {
        getSnapshot: () => (resolve()?.getSnapshot().draft.length ?? 0) > 0,
        subscribe: listener => {
            let current;
            let offInput = () => { };
            const bind = () => {
                const next = resolve();
                if (next !== current) {
                    offInput();
                    current = next;
                    offInput = next?.subscribe(listener) ?? (() => { });
                }
                listener();
            };
            const offSelection = selection.subscribe(bind);
            bind();
            return () => { offSelection(); offInput(); };
        },
    };
}
/** 任务建议只能填入空闲且空白的草稿，不覆盖附件、提及或正在提交的内容。 */
export function prefillNewConversation(input, text) {
    if (input === undefined)
        return 'workspace';
    const state = input.state.getSnapshot();
    if (state.phase !== 'plain')
        return 'busy';
    if (state.draft.trim() !== '' || hasDraftAttachments(state) || state.occurrences.length > 0)
        return 'draft';
    input.setDraft(text);
    return 'ready';
}
//# sourceMappingURL=new-conversation-draft.js.map