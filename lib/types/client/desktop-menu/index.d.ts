export interface MenuItemDefinition {
    readonly id: string;
    readonly label: string;
    readonly separatorBefore?: boolean;
    readonly action?: () => void | Promise<void>;
}
export declare function closeActiveMenu(restoreFocus?: boolean): void;
export declare function openDropdown(anchor: HTMLButtonElement, items: readonly MenuItemDefinition[], options?: {
    focusFirst?: boolean;
}): void;
/**
 * 检查桌面端窗口菜单子插件在 Host 侧是否启用
 */
export declare function checkDesktopMenuEnabled(): Promise<boolean>;
/**
 * 观察并在 Windows 桌面端的 data-windows-menu 宿主上注入【帮助】菜单。
 * 只追加一个入口，官方【应用】【编辑】保持原样。
 */
export declare function observeDesktopTitlebarMenus(translate?: (key: string, fallback?: string) => string): () => void;
//# sourceMappingURL=index.d.ts.map