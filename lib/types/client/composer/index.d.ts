import type { Context } from '@deepseek-ai/cordis';
export declare const COMPOSER_ENHANCEMENT_STYLE_ID = "dcu-composer-enhancements-style";
/** 探测宿主 workspace-browser-composer 子组件是否处于激活状态（遵循 fail-closed 契约） */
export declare function checkComposerEnabled(): Promise<boolean>;
/**
 * 读取 Host 状态：子插件是否启用，以及站点级是否允许预测。
 * 网络/解析失败一律返回“全部关闭”，避免在宿主不可达时仍然悄悄花 token。
 */
export declare function fetchComposerStatus(): Promise<{
    enabled: boolean;
    prediction: boolean;
}>;
/**
 * 启动并管理 Composer 输入框核心增强能力：
 * 1. 终端风格输入历史记录与召回 (↑/↓)
 * 2. 输入框宽度初始化与拖拽手柄
 * 3. 新建会话建议卡片
 *
 * 当子插件关闭时，所有增强功能彻底注销并恢复 DSH 官方原生输入区。
 */
export declare function observeComposerEnhancements(ctx: Context): () => void;
//# sourceMappingURL=index.d.ts.map