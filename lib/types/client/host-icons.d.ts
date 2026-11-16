import { type ComponentType } from 'react';
/** 宿主图标组件。只声明调用方实际传入的属性。 */
export type HostIcon = ComponentType<{
    size?: number;
    className?: string;
}>;
/**
 * 跨宿主版本图标安全解析器：按候选名依次匹配（新版 → 老版 → Medium/Regular 变体），
 * 全部缺失时才回退到给到的 fallback；没有 fallback 就抛错（由单测保护）。
 * 生产路径的 `hostIcon` 也走这里 —— 只有一套候选顺序，避免「测试改的是导出函数、线上走的是另一套」。
 */
export declare function resolveHostIcon(icons: Record<string, HostIcon | undefined>, candidates: readonly string[], fallback?: HostIcon): HostIcon;
export declare const IconCheckOutlineMedium: HostIcon;
export declare const IconDownloadOutlineMedium: HostIcon;
export declare const IconListPenOutlineMedium: HostIcon;
export declare const IconLoadingOutlineMedium: HostIcon;
export declare const IconRefreshOutlineMedium: HostIcon;
export declare const IconChevronDownOutlineMedium: HostIcon;
//# sourceMappingURL=host-icons.d.ts.map