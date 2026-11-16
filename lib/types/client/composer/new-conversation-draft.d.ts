export type PrefillResult = 'ready' | 'workspace' | 'draft' | 'busy';
export type DraftPresenceSource = {
    getSnapshot: () => boolean;
    subscribe: (listener: () => void) => () => void;
};
type DraftState = {
    getSnapshot: () => {
        draft: string;
    };
    subscribe: (listener: () => void) => () => void;
};
/** 跟随当前会话的原草稿状态，覆盖输入、粘贴、历史召回和任务预填。 */
export declare function createDraftPresenceSource(selection: Pick<DraftState, 'subscribe'>, resolve: () => DraftState | undefined): DraftPresenceSource;
type DraftInput = {
    state: {
        getSnapshot: () => {
            phase: string;
            draft: string;
            imageIds?: readonly unknown[];
            attachmentIds?: readonly unknown[];
            occurrences: readonly unknown[];
        };
    };
    setDraft: (text: string) => void;
};
/** 任务建议只能填入空闲且空白的草稿，不覆盖附件、提及或正在提交的内容。 */
export declare function prefillNewConversation(input: DraftInput | undefined, text: string): PrefillResult;
export {};
//# sourceMappingURL=new-conversation-draft.d.ts.map