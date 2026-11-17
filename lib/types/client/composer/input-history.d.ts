export declare const HISTORY_KEY = "michengai.workspace-ui.input-history.v1";
type StorageFace = Pick<Storage, 'getItem' | 'setItem'>;
/** 只保存已发送文本；浏览器存储失败时仍保留本次内存历史。 */
export declare class InputHistory {
    private readonly storage?;
    private readonly limit;
    private readonly warn;
    private readonly scopes;
    constructor(storage?: StorageFace | undefined, limit?: number, warn?: (message: string) => void);
    list(scope: string): readonly string[];
    add(scope: string, text: string): void;
}
/** 从空输入进入，编辑历史即退出，避免覆盖用户的新草稿。 */
export declare class HistoryCursor {
    private index;
    private original;
    private displayed;
    private entries;
    reset(): void;
    move(direction: -1 | 1, draft: string, entries: readonly string[]): string | undefined;
}
export {};
//# sourceMappingURL=input-history.d.ts.map