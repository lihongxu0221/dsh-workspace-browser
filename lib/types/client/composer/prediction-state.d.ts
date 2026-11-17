/**
 * 输入预测（ghost 建议）的用户级开关。
 *
 * 设计约束：
 * - **只影响预测**，不牵连 `↑`/`↓` 历史召回、宽度手柄、新会话建议卡片；
 * - 关闭后客户端**完全不发请求**，所以不产生任何辅助模型 token 花费（不需要 Host 侧再校验一次）；
 * - `hostAllowed` 来自 Host 状态端点：profile 的 `cordis.patch.yml` 给 `workspace-ui-composer`
 *   配 `config: { prediction: false }` 时会被置为 `false`，此时用户开关置灰（fail-closed，
 *   站点管理员意志优先，等价于主题子插件的 `subPluginEnabled` 语义）。
 */
export declare const PREDICTION_STORAGE_KEY = "workspace-ui.composer.prediction";
/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
export declare const PREDICTION_STORAGE_EVENT = "workspace-ui:prediction-change";
export type PredictionMode = 'off' | 'continue' | 'all';
export interface PredictionSettingsState {
    /** 子插件在 Host 侧是否启用；未启用时整个设置卡片不渲染（对齐 ThemeSettingsCard 规范）。 */
    readonly subPluginEnabled: boolean;
    /** 用户开关；`false` 表示用户主动关闭预测（mode === 'off'）。保持兼容。 */
    readonly userEnabled: boolean;
    /** 预测模式：'off' 关闭 | 'continue' 仅续写 | 'all' 推测+续写 */
    readonly mode: PredictionMode;
    /** Host 侧是否允许预测（配置未声明时默认允许）。 */
    readonly hostAllowed: boolean;
    /** 最终生效值：子插件启用且未处于 off 且 Host 允许才预测。 */
    readonly enabled: boolean;
    /** 是否允许空输入框推测（next 模式）：仅在 all 模式且全局生效时启用。 */
    readonly nextEnabled: boolean;
    /** 是否允许打字光标处行内续写（continue 模式）：在 continue 与 all 模式生效。 */
    readonly continueEnabled: boolean;
}
export declare function parseStoredMode(raw: string | null): PredictionMode;
/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
export declare function getPredictionSettingsState(): PredictionSettingsState;
export declare function subscribePredictionSettings(listener: () => void): () => void;
/** 当前是否应当请求预测；组件热路径用这个，避免每次分配对象。 */
export declare function isPredictionEnabled(): boolean;
export declare function setPredictionMode(mode: PredictionMode): void;
/**
 * @deprecated 历史二态兼容入口，仅供旧用例过渡；生产侧请直接调用 setPredictionMode。
 * 保护用户已有细分模式：当从关闭状态重新打开且传入 true 时兜底切为 'all'；已处于开启状态（如 continue）时不重置为 all；关闭时切为 'off'。
 */
export declare function setPredictionEnabled(enabled: boolean): void;
/** Host 状态端点回报的配置位；缺省视为允许。 */
export declare function setHostPredictionAllowed(allowed: boolean): void;
/** 标记 workspace-ui-composer 子插件在 Host 侧的启用状态；未启用时设置卡片不渲染（对齐主题卡片）。 */
export declare function setSubPluginEnabled(enabled: boolean): void;
/** 测试用：按当前 localStorage 与默认 hostAllowed 重建内存状态。 */
export declare function refreshPredictionSettingsSnapshot(): void;
/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
export declare function observePredictionSettings(): () => void;
//# sourceMappingURL=prediction-state.d.ts.map