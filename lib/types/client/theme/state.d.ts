import type { GlassMode, GlassPreset } from './glass.ts';
export type ThemeOption = 'stock' | 'codex-dark' | 'codex-light' | 'claude-dark' | 'claude-light' | 'dracula' | 'solarized-dark' | 'solarized-light' | 'gruvbox-dark' | 'gruvbox-light' | 'catppuccin-mocha' | 'catppuccin-macchiato' | 'catppuccin-frappe' | 'catppuccin-latte' | 'cyberpunk';
export interface ThemeSettingsState {
    readonly themeOption: ThemeOption;
    readonly glassEnabled: boolean;
    readonly glassMode: GlassMode;
    readonly glassPreset: GlassPreset;
    readonly glassGlow: boolean;
    readonly subPluginEnabled: boolean;
}
export declare const STORAGE_KEYS: Readonly<{
    themeOption: "codex-ui.theme.option";
    glassEnabled: "codex-ui.glass.enabled";
    glassMode: "codex-ui.glass.mode";
    glassPreset: "codex-ui.glass.preset";
    glassGlow: "codex-ui.glass.glow";
}>;
/** 检查当前主题子插件是否在 Host 侧处于激活启用状态 */
export declare function isThemeSubPluginEnabled(): boolean;
/** 供状态机与测试更新主题子插件启用标记，并广播触发响应式重渲染 */
export declare function setThemeSubPluginEnabled(enabled: boolean): void;
/** 强制重算并刷新主题与云母外观配置快照（测试用例或外部直接写入 localStorage 时使用） */
export declare function refreshThemeSettingsSnapshot(): ThemeSettingsState;
/** 获取当前主题与云母外观配置快照（通过事件驱动同步，避免高频无谓读盘） */
export declare function getThemeSettingsState(): ThemeSettingsState;
export declare function setThemeOption(themeOption: ThemeOption): void;
export declare function setGlassEnabled(enabled: boolean): void;
export declare function setGlassMode(mode: GlassMode): void;
export declare function setGlassPreset(preset: GlassPreset): void;
export declare function setGlassGlow(glow: boolean): void;
export declare function subscribeThemeSettings(listener: () => void): () => void;
//# sourceMappingURL=state.d.ts.map