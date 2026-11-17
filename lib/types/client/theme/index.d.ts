import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client';
import { type GlassMode, type GlassPreset } from './glass.ts';
import { type ThemeOption } from './state.ts';
export * from './glass.ts';
export * from './palettes.ts';
export * from './shiki-tokens.ts';
export * from './state.ts';
/**
 * 校验主题子插件是否在 Host 侧被显式停用。
 * 遵循统一的 fail-closed 契约：当端点 404 或网络不可达时视为停用并回退官方。
 */
export declare function checkThemeEnabled(): Promise<boolean>;
export declare const THEME_SURFACE_STYLE_ID = "dsh-workspace-ui-theme-surface-style";
/**
 * 确保注入消除插件页等场景色差的全局表面样式
 */
export declare function ensureThemeSurfaceStyles(doc?: Document): void;
export declare function removeThemeSurfaceStyles(doc?: Document): void;
/**
 * 彻底恢复宿主官方原生主题呈现（严格遵循宿主 ui-layout / ThemePresenter 契约规范）：
 * - 优先从 runtime.getTheme() 快照权威读取 active.colorScheme，未就绪时安全回退到 prefers-color-scheme；
 * - 严格约束 data-ds-theme-source 仅允许 'system' | 'dark' | 'light'，严禁把自定义主题 id 写到根节点导致 Electron preload 越界；
 * - 绝不盲目删除 data-ds-dark-theme，确保深色模式下切回/停用时稳稳保持黑色底盘！
 */
export declare function restoreNativeThemePresentation(themeRuntime?: ThemeRuntime): void;
/**
 * 将指定主题精准映射并深度应用到真实 DOM（双重保险，彻底压制并覆盖官方亮暗限制）
 */
export declare function applyThemeToDocument(themeOption: ThemeOption, themeRuntime?: ThemeRuntime, syncRuntime?: boolean): void;
/**
 * 供 UI 直接调用的主题切换入口，立即执行 ThemeRuntime.setTheme 并持久化。
 */
export declare function changeTheme(themeOption: ThemeOption): void;
/**
 * 供 UI 直接调用的玻璃质感与排版模式切换入口。
 */
export declare function changeGlass(options: {
    enabled?: boolean;
    mode?: GlassMode;
    preset?: GlassPreset;
    glow?: boolean;
}): void;
/**
 * 挂载并观察主题与外观增强：
 * - 注册全部 6 套内置主题至 ThemeRuntime；
 * - 响应本地配置与云母模式切换；
 * - 卸载时纯净还原 DOM 与官方主题。
 */
export declare function observeTheme(ctx: ClientContext): () => void;
//# sourceMappingURL=index.d.ts.map