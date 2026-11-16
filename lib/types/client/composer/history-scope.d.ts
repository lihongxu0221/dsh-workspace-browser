/**
 * 输入历史（↑/↓ 召回）的作用域偏好。
 *
 * 设计约束：
 * - 默认按**会话**隔离：每个会话只召回自己发送过的输入，避免同一工作区里
 *   不同会话的历史互相污染（终端风格历史应当像 shell 一样属于当前上下文）。
 * - 需要跨会话复用时，用户可在「设置 → Codex UI → 输入框增强」切回**工作区**模式；
 *   旧版本按 cwd 存储的历史仍保留，切回后即可继续召回。
 * - 与预测开关一样属于用户级偏好，存 localStorage；Host 侧不参与，避免站点配置
 *   把用户的输入历史锁死。
 */
export type HistoryScope = 'session' | 'workspace';
export declare const HISTORY_SCOPE_STORAGE_KEY = "codex-ui.composer.history-scope";
/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
export declare const HISTORY_SCOPE_STORAGE_EVENT = "codex-ui:history-scope-change";
export declare function parseStoredHistoryScope(raw: string | null | undefined): HistoryScope;
/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
export declare function getHistoryScope(): HistoryScope;
export declare function subscribeHistoryScope(listener: () => void): () => void;
export declare function setHistoryScope(scope: HistoryScope): void;
/**
 * @internal
 * 仅限单元测试在重置 `localStorage` 后同步刷新模块级缓存快照。
 * 未经 `src/client/index.ts` 或包出口暴露到外部运行时 API。
 */
export declare function refreshHistoryScopeSnapshot(): void;
/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
export declare function observeHistoryScope(): () => void;
//# sourceMappingURL=history-scope.d.ts.map