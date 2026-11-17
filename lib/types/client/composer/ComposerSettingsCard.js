import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives';
import { SECTION_CARD_CSS, SETTINGS_ROW_CSS } from "../section-card-styles.js";
import { getPredictionSettingsState, setPredictionMode, subscribePredictionSettings, } from "./prediction-state.js";
import { getHistoryScope, setHistoryScope, subscribeHistoryScope, } from "./history-scope.js";
import { PredictionModelPicker } from "./PredictionModelPicker.js";
/**
 * 输入框增强设置卡片。
 *
 * 放预测开关与 ↑/↓ 历史召回范围；宽度手柄、建议卡片没有可调项，
 * 用不到就不渲染成灰项，遵循插件「不残留死配置」的既有约定。
 *
 * 站点级关闭（profile `cordis.patch.yml` 里 `config: { prediction: false }`）时，
 * 开关保持可见但置为关闭且禁用，并给出原因提示——比整卡消失更容易排查。
 */
export function ComposerSettingsCard({ t }) {
    const state = useSyncExternalStore(subscribePredictionSettings, getPredictionSettingsState, getPredictionSettingsState);
    const historyScope = useSyncExternalStore(subscribeHistoryScope, getHistoryScope, getHistoryScope);
    // 当输入增强子插件在 Host 侧被停用时，遵照规范：设置卡片直接全部隐藏，不渲染任何 DOM（与 ThemeSettingsCard 保持一致）
    if (!state.subPluginEnabled) {
        return null;
    }
    const lockedByHost = !state.hostAllowed;
    return (_jsxs("div", { className: "wui-section-card wui-composer-settings", "aria-label": t('composer.title'), children: [_jsx("style", { children: SECTION_CARD_CSS + SETTINGS_ROW_CSS }), _jsx("div", { className: "wui-section-header", children: _jsxs("div", { className: "wui-section-title-wrap", children: [_jsx("h3", { className: "wui-section-title", children: t('composer.title') }), _jsx("p", { className: "wui-section-desc", children: t('composer.desc') })] }) }), _jsxs("div", { className: "wui-settings-row", children: [_jsxs("div", { className: "wui-settings-row-label", children: [_jsx("span", { className: "wui-settings-row-title", children: t('composer.prediction') }), _jsx("span", { className: "wui-settings-row-hint", children: lockedByHost ? t('composer.predictionLocked') : t('composer.predictionHint') })] }), _jsx(SegmentedControl, { id: "workspace-ui-composer-prediction-mode", label: t('composer.prediction'), value: state.mode, disabled: lockedByHost, options: [
                            { value: 'off', label: t('composer.modeOff') },
                            { value: 'continue', label: t('composer.modeContinue') },
                            { value: 'all', label: t('composer.modeAll') },
                        ], onChange: (nextMode) => {
                            if (lockedByHost)
                                return;
                            setPredictionMode(nextMode);
                        } })] }), _jsxs("div", { className: "wui-settings-row", children: [_jsxs("div", { className: "wui-settings-row-label", children: [_jsx("span", { className: "wui-settings-row-title", children: t('composer.predictionModel') }), _jsx("span", { className: "wui-settings-row-hint", children: t('composer.predictionModelHint') })] }), _jsx(PredictionModelPicker, { t: t, disabled: lockedByHost || state.mode === 'off' })] }), _jsxs("div", { className: "wui-settings-row", children: [_jsxs("div", { className: "wui-settings-row-label", children: [_jsx("span", { className: "wui-settings-row-title", children: t('composer.historyScope') }), _jsx("span", { className: "wui-settings-row-hint", children: t('composer.historyScopeHint') })] }), _jsx(SegmentedControl, { id: "workspace-ui-composer-history-scope", label: t('composer.historyScope'), value: historyScope, options: [
                            { value: 'session', label: t('composer.historyScopeSession') },
                            { value: 'workspace', label: t('composer.historyScopeWorkspace') },
                        ], onChange: (nextScope) => { setHistoryScope(nextScope); } })] })] }));
}
//# sourceMappingURL=ComposerSettingsCard.js.map