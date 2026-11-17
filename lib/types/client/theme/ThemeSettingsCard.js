import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives';
import { SECTION_CARD_CSS } from "../section-card-styles.js";
import { changeGlass, changeTheme, getThemeSettingsState, subscribeThemeSettings, } from "./index.js";
const THEME_BUTTONS = [
    { id: 'stock', labelKey: 'theme.paletteStock', subKey: 'theme.subStock', accent: '#3b82f6', colorScheme: 'auto' },
    { id: 'codex-dark', labelKey: 'theme.paletteCodexDark', subKey: 'theme.subCodexDark', accent: '#339cff', colorScheme: 'dark' },
    { id: 'codex-light', labelKey: 'theme.paletteCodexLight', subKey: 'theme.subCodexLight', accent: '#0169cc', colorScheme: 'light' },
    { id: 'claude-dark', labelKey: 'theme.paletteClaudeDark', subKey: 'theme.subClaudeDark', accent: '#d97757', colorScheme: 'dark' },
    { id: 'claude-light', labelKey: 'theme.paletteClaudeLight', subKey: 'theme.subClaudeLight', accent: '#d97757', colorScheme: 'light' },
    { id: 'dracula', labelKey: 'theme.paletteDracula', subKey: 'theme.subDracula', accent: '#ff79c6', colorScheme: 'dark' },
    { id: 'solarized-dark', labelKey: 'theme.paletteSolarizedDark', subKey: 'theme.subSolarizedDark', accent: '#2aa198', colorScheme: 'dark' },
    { id: 'solarized-light', labelKey: 'theme.paletteSolarizedLight', subKey: 'theme.subSolarizedLight', accent: '#268bd2', colorScheme: 'light' },
    { id: 'gruvbox-dark', labelKey: 'theme.paletteGruvboxDark', subKey: 'theme.subGruvboxDark', accent: '#fabd2f', colorScheme: 'dark' },
    { id: 'gruvbox-light', labelKey: 'theme.paletteGruvboxLight', subKey: 'theme.subGruvboxLight', accent: '#b57614', colorScheme: 'light' },
    { id: 'catppuccin-mocha', labelKey: 'theme.paletteMocha', subKey: 'theme.subMocha', accent: '#cba6f7', colorScheme: 'dark' },
    { id: 'catppuccin-macchiato', labelKey: 'theme.paletteMacchiato', subKey: 'theme.subMacchiato', accent: '#c6a0f6', colorScheme: 'dark' },
    { id: 'catppuccin-frappe', labelKey: 'theme.paletteFrappe', subKey: 'theme.subFrappe', accent: '#ca9ee6', colorScheme: 'dark' },
    { id: 'catppuccin-latte', labelKey: 'theme.paletteLatte', subKey: 'theme.subLatte', accent: '#8839ef', colorScheme: 'light' },
    { id: 'cyberpunk', labelKey: 'theme.paletteCyberpunk', subKey: 'theme.subCyberpunk', accent: '#00ff41', colorScheme: 'dark' },
];
const stylesheet = `
${SECTION_CARD_CSS}
.wui-theme-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wui-theme-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wui-theme-palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 8px;
}
.wui-theme-cube {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.02));
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}
.wui-theme-cube:hover:not(.selected) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
  border-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
}
.wui-theme-cube:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
/* 选中态：深度融入主题专属强调色与同色发光边框 */
.wui-theme-cube.selected {
  background: color-mix(in srgb, var(--cube-accent) 14%, var(--dsw-alias-bg-layer-2, #18181b)) !important;
  border-color: var(--cube-accent) !important;
  box-shadow: 0 0 0 1px var(--cube-accent), 0 2px 10px color-mix(in srgb, var(--cube-accent) 25%, transparent) !important;
}
.wui-theme-cube-head {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 100%;
}
.wui-theme-swatch {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background-color: var(--cube-accent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--cube-accent) 45%, transparent);
}
.wui-theme-cube-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wui-theme-cube.selected .wui-theme-cube-title {
  font-weight: 600;
}
.wui-theme-cube-sub {
  font-size: 11px;
  line-height: 15px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.wui-theme-cube.selected .wui-theme-cube-sub {
  color: var(--dsw-alias-label-secondary);
}
.wui-theme-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
  flex: 1;
}
.wui-theme-row-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.wui-theme-row-hint {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.wui-theme-sub-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
}
.wui-theme-row,
.wui-theme-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.wui-theme-sub-row [role="tablist"],
.wui-theme-sub-row [data-slot="segmented-control"] {
  min-width: 240px;
}
.wui-theme-code-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.wui-theme-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wui-theme-code-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
}
.wui-theme-code-lang {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--dsw-font-markdown-code-block-font-family, var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
}
.wui-theme-code-sample {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--dsw-alias-markdown-code-block, var(--dsw-alias-bg-layer-2));
  color: var(--shiki-foreground, var(--dsw-alias-label-primary));
  font-family: var(--dsw-font-markdown-code-block-font-family, var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
  font-size: 12px;
  line-height: 20px;
  white-space: pre;
  overflow-x: auto;
}
.wui-tok-keyword {
  color: var(--shiki-token-keyword, var(--dsw-static-blue-500));
}
.wui-tok-function {
  color: var(--shiki-token-function, var(--dsw-static-amber-500));
}
.wui-tok-parameter {
  color: var(--shiki-token-parameter, var(--dsw-alias-label-primary));
}
.wui-tok-string {
  color: var(--shiki-token-string, var(--dsw-static-green-500));
}
.wui-tok-punct {
  color: var(--shiki-token-punctuation, var(--dsw-alias-label-secondary));
}
.wui-tok-comment {
  color: var(--shiki-token-comment, var(--dsw-alias-label-tertiary));
  font-style: italic;
}
`;
export function ThemeSettingsCard({ t }) {
    const state = useSyncExternalStore(subscribeThemeSettings, getThemeSettingsState, getThemeSettingsState);
    // 当主题子插件在 Host 侧被停用时，遵照规范：设置面板换肤内容直接全部隐藏，不渲染任何 DOM
    if (!state.subPluginEnabled) {
        return null;
    }
    return (_jsxs("div", { className: "wui-section-card wui-theme-settings", "aria-label": t('theme.title'), children: [_jsx("style", { children: stylesheet }), _jsx("div", { className: "wui-section-header", children: _jsxs("div", { className: "wui-section-title-wrap", children: [_jsx("h3", { className: "wui-section-title", children: t('theme.title') }), _jsx("p", { className: "wui-section-desc", children: t('theme.desc') })] }) }), _jsxs("div", { className: "wui-theme-section", children: [_jsxs("div", { className: "wui-theme-row-label", children: [_jsx("span", { className: "wui-theme-row-title", children: t('theme.palette') }), _jsx("span", { className: "wui-theme-row-hint", children: t('theme.paletteHint') })] }), _jsx("div", { className: "wui-theme-palette-grid", role: "group", "aria-label": t('theme.palette'), children: THEME_BUTTONS.map((item) => {
                            const isActive = state.themeOption === item.id;
                            return (_jsxs("button", { type: "button", className: `wui-theme-cube${isActive ? ' selected' : ''}`, style: { '--cube-accent': item.accent }, "aria-pressed": isActive, onClick: () => {
                                    changeTheme(item.id);
                                }, children: [_jsxs("div", { className: "wui-theme-cube-head", children: [_jsx("span", { className: "wui-theme-swatch", "aria-hidden": "true" }), _jsx("span", { className: "wui-theme-cube-title", children: t(item.labelKey) })] }), _jsx("span", { className: "wui-theme-cube-sub", children: t(item.subKey) })] }, item.id));
                        }) }), _jsxs("div", { className: "wui-theme-code-preview", children: [_jsxs("div", { className: "wui-theme-code-header", children: [_jsx("span", { className: "wui-theme-code-label", children: t('theme.codeHighlight') }), _jsx("span", { className: "wui-theme-code-lang", children: "JavaScript" })] }), _jsx("pre", { className: "wui-theme-code-sample", tabIndex: 0, "aria-label": t('theme.codeHighlight'), children: _jsxs("code", { children: [_jsx("span", { className: "wui-tok-comment", children: "// A sample JavaScript code" }), '\n', _jsx("span", { className: "wui-tok-keyword", children: "const" }), ' ', _jsx("span", { className: "wui-tok-function", children: "greet" }), _jsx("span", { className: "wui-tok-punct", children: ' = (' }), _jsx("span", { className: "wui-tok-parameter", children: "name" }), _jsx("span", { className: "wui-tok-punct", children: ') => ' }), _jsx("span", { className: "wui-tok-string", children: '`hi ${name}`' }), _jsx("span", { className: "wui-tok-punct", children: ";" }), '\n', _jsx("span", { className: "wui-tok-keyword", children: "console" }), _jsx("span", { className: "wui-tok-punct", children: "." }), _jsx("span", { className: "wui-tok-function", children: "log" }), _jsx("span", { className: "wui-tok-punct", children: "(" }), _jsx("span", { className: "wui-tok-function", children: "greet" }), _jsx("span", { className: "wui-tok-punct", children: "(" }), _jsx("span", { className: "wui-tok-string", children: "'world'" }), _jsx("span", { className: "wui-tok-punct", children: "));" })] }) })] })] }), _jsxs("div", { className: "wui-theme-row", children: [_jsxs("div", { className: "wui-theme-row-label", children: [_jsx("span", { className: "wui-theme-row-title", children: t('theme.glassEnable') }), _jsx("span", { className: "wui-theme-row-hint", children: t('theme.glassHint') })] }), _jsx(Switch, { label: t('theme.glassEnable'), checked: state.glassEnabled, onChange: (checked) => {
                            changeGlass({ enabled: checked });
                        } })] }), state.glassEnabled && (_jsxs("div", { className: "wui-theme-sub-group", children: [_jsxs("div", { className: "wui-theme-sub-row", children: [_jsxs("div", { className: "wui-theme-row-label", children: [_jsx("span", { className: "wui-theme-row-title", children: t('theme.mode') }), _jsx("span", { className: "wui-theme-row-hint", children: t('theme.modeHint') })] }), _jsx(SegmentedControl, { id: "workspace-ui-glass-mode", label: t('theme.mode'), value: state.glassMode, options: [
                                    { value: 'compat', label: t('theme.modeCompat') },
                                    { value: 'mica', label: t('theme.modeMica') },
                                ], onChange: (nextMode) => {
                                    changeGlass({ mode: nextMode, enabled: true });
                                } })] }), _jsxs("div", { className: "wui-theme-sub-row", children: [_jsxs("div", { className: "wui-theme-row-label", children: [_jsx("span", { className: "wui-theme-row-title", children: t('theme.glassPreset') }), _jsx("span", { className: "wui-theme-row-hint", children: t('theme.glassPresetHint') })] }), _jsx(SegmentedControl, { id: "workspace-ui-glass-preset", label: t('theme.glassPreset'), value: state.glassPreset, options: [
                                    { value: 'clear', label: t('theme.presetClear') },
                                    { value: 'standard', label: t('theme.presetStandard') },
                                    { value: 'frosted', label: t('theme.presetFrosted') },
                                ], onChange: (nextPreset) => {
                                    changeGlass({ preset: nextPreset, enabled: true });
                                } })] }), _jsxs("div", { className: "wui-theme-sub-row", children: [_jsxs("div", { className: "wui-theme-row-label", children: [_jsx("span", { className: "wui-theme-row-title", children: t('theme.glassGlow') }), _jsx("span", { className: "wui-theme-row-hint", children: t('theme.glassGlowHint') })] }), _jsx(Switch, { label: t('theme.glassGlow'), checked: state.glassGlow, onChange: (nextGlow) => {
                                    changeGlass({ glow: nextGlow, enabled: true });
                                } })] })] }))] }));
}
//# sourceMappingURL=ThemeSettingsCard.js.map