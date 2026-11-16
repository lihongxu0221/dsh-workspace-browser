type Editor = HTMLElement;
export interface KeyboardAdapter {
    draft(): string;
    entries(): readonly string[];
    blocked(): boolean;
    setDraft(text: string): void;
}
/** 只处理当前输入框的历史按键，保持 IME、菜单和富内容的原有行为。 */
export declare function bindHistoryKeys(editor: Editor, adapter: KeyboardAdapter): () => void;
/** 从本 slot 向上寻找唯一输入框，避免绑定侧栏、搜索或其他会话。 */
export declare function findComposer(anchor: HTMLElement): Editor | undefined;
export {};
//# sourceMappingURL=input-history-keyboard.d.ts.map