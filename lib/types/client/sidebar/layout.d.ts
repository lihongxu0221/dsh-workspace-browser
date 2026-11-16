/**
 * 侧栏导航布局模型：
 * 只保存「常驻顺序」与「收入更多的顺序」，入口本身仍由宿主注册与渲染。
 * 纯函数，方便单测；不读写 localStorage。
 */
/** 宿主固定的入口：始终常驻，不参与收纳与拖动。 */
export declare const FIXED_PANEL_IDS: readonly ["plugins"];
/** 首次使用时默认常驻的入口（除固定入口外全部收入更多）。 */
export declare const DEFAULT_PINNED: readonly string[];
export declare const SIDEBAR_LAYOUT_KEY = "michengai.codex-ui.sidebar-layout.v1";
export type SidebarZone = 'pinned' | 'more';
export interface SidebarLayout {
    pinned: string[];
    more: string[];
}
export interface SidebarDropTarget {
    id: string;
    zone: SidebarZone;
    index: number;
}
/** 解析持久化内容；格式不符时返回 undefined，由调用方回退默认布局。 */
export declare function parseLayout(raw: string | null): SidebarLayout | undefined;
export declare function serializeLayout(layout: SidebarLayout): string;
/**
 * 把已保存布局与当前实际注册的入口对齐：
 * - 固定入口由宿主恒定渲染，不写入布局数据；
 * - 保存过但已消失的入口丢弃；
 * - 新出现的入口追加到更多末尾，不打断用户已有顺序；
 * - 同一入口不会同时出现在两个分区。
 */
export declare function normalizeLayout(saved: SidebarLayout | undefined, availableIds: readonly string[]): SidebarLayout;
/** 常驻区的实际渲染顺序。 */
export declare function orderedPinned(layout: SidebarLayout): string[];
/**
 * 把入口移动到目标分区的位置：
 * - 固定入口不可移动；
 * - 未知入口忽略；
 * - 越界索引收敛到末尾。
 */
export declare function moveEntry(layout: SidebarLayout, target: SidebarDropTarget): SidebarLayout;
//# sourceMappingURL=layout.d.ts.map