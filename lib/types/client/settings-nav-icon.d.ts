import React from 'react';
/**
 * 为工作区 UI在 DSH 原生设置导航中补上专属的 16x16 矢量图标。
 * 遵循与 dshmarket / dsh-automation 一致的非侵入式属性标记与 CSS mask 伪元素标准。
 */
export declare const WORKSPACE_UI_NAV_MARKER = "data-wui-nav-icon";
/** 原生 settings.section.icon 插槽图标组件 */
export declare function WorkspaceUiNavIcon({ size }: {
    size?: number;
}): React.ReactElement;
/** 把「Workspace UI」设置项按钮切到原生插槽图标之外的自绘 icon（属性标记 + CSS mask）。
 *  返回值表示「本次调用改动了该按钮的状态」（打上或移除了标记），供调用方做变更统计。 */
export declare function applyNavIcon(button: HTMLButtonElement, getLabel: () => string): boolean;
export declare function observeSettingsNavIcon(getLabel: () => string, doc?: Document): () => void;
//# sourceMappingURL=settings-nav-icon.d.ts.map