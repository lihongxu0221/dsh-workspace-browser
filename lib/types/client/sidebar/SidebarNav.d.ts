import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type FC } from 'react';
import { type SidebarLayout } from './layout.ts';
export interface PanelItem {
    id: string;
    label: string;
    order: number;
    component?: FC<{
        size?: number;
        active?: boolean;
    }>;
}
export interface SidebarNavProps {
    ctx: ClientContext;
    onLayoutChange?: (layout: SidebarLayout) => void;
    initialLayout?: SidebarLayout;
}
/**
 * 独立的 React 侧栏导航组件：
 * - 接管新会话行、固定常驻区（如 plugins）、用户常驻区与折叠“更多”区；
 * - 原位折叠动画与键盘无障碍管理；
 * - 采用指针手势（Pointer Drag）驱动双向排序与跨区移动，全面规避 Electron HTML5 OS 拖拽拦截；
 * - 鼠标移上去呈现优雅的圆角胶囊形态。
 */
export declare const SidebarNav: FC<SidebarNavProps>;
//# sourceMappingURL=SidebarNav.d.ts.map