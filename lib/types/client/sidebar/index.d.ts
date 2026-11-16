import type { Context as ClientContext } from '@deepseek-ai/cordis';
export * from './layout.ts';
export * from './SidebarNav.tsx';
/**
 * 校验侧栏子插件是否在 Host 侧启用。
 * 遵循 fail-closed 原则：404、网络失败或未显式 enabled 时视为关闭并回退官方。
 */
export declare function checkSidebarEnabled(): Promise<boolean>;
/**
 * 挂载并观察侧栏导航增强：
 * - 只有在子插件探活成功时激活；
 * - 在原生 newSession 前挂载唯一的 React 独立导航容器；
 * - 靶向隐藏原生 newSession 与 panelList，绝不删除或克隆宿主 DOM 节点；
 * - 观察器仅监听挂载容器的存续，彻底切断 DOM 自触发循环；
 * - 卸载时彻底 unmount React Root、移除样式与标记，原生侧栏无损秒级复原。
 */
export declare function observeSidebarNav(ctx: ClientContext): () => void;
//# sourceMappingURL=index.d.ts.map