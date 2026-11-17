import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@deepseek-ai/dsh-client-ui-primitives';
import { zh, en } from "../workspace-ui-locales.js";
let isSkinEnabled = true;
const skinStateListeners = new Set();
export function setSkinEnabledState(enabled) {
    if (isSkinEnabled !== enabled) {
        isSkinEnabled = enabled;
        skinStateListeners.forEach(fn => fn(enabled));
    }
}
export function subscribeSkinEnabledState(fn) {
    skinStateListeners.add(fn);
    return () => { skinStateListeners.delete(fn); };
}
let currentQuery = '';
const listeners = new Set();
export function getNavSearchQuery() {
    return currentQuery;
}
export function setNavSearchQuery(query) {
    currentQuery = query;
    listeners.forEach(fn => fn(query));
}
export function subscribeNavSearch(fn) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
export function SettingsNavHeader(props = {}) {
    const [enabled, setEnabled] = useState(isSkinEnabled);
    const [query, setQuery] = useState(currentQuery);
    const isZh = typeof document !== 'undefined' && (document.documentElement.lang || 'zh').startsWith('zh');
    const dict = isZh ? zh : en;
    const t = props.t ?? ((key) => dict[key] ?? key);
    useEffect(() => {
        return subscribeSkinEnabledState(state => setEnabled(state));
    }, []);
    useEffect(() => {
        return subscribeNavSearch(q => setQuery(q));
    }, []);
    const handleQueryChange = (val) => {
        setQuery(val);
        setNavSearchQuery(val);
    };
    const handleClose = () => {
        const dialog = document.querySelector('[data-shortcut-modal="settings"]');
        const closeBtn = dialog?.querySelector('button[class*="close"]');
        if (closeBtn) {
            closeBtn.click();
        }
        else {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        }
    };
    // 当原生设置皮肤子组件被关闭时，100% 回退至宿主官方纯文本标题外观，绝不插入任何返回按钮或搜索框！
    if (!enabled) {
        return _jsx(_Fragment, { children: t('settings.title') });
    }
    return (_jsxs("div", { className: "wui-settings-nav-header-root", children: [_jsxs("div", { className: "wui-settings-nav-header-top", children: [_jsx("button", { type: "button", className: "wui-settings-back-btn", onClick: handleClose, "aria-label": t('settings.back'), title: t('settings.back'), children: _jsx(ArrowLeft, { size: 16, "aria-hidden": "true" }) }), _jsx("span", { className: "wui-settings-nav-header-title", children: t('settings.title') })] }), _jsx("div", { className: "wui-settings-search-wrapper", children: _jsx(Input, { type: "search", className: "wui-settings-search-input", icon: _jsx(Search, { size: 14, className: "wui-settings-search-icon", "aria-hidden": "true" }), placeholder: t('settings.search'), "aria-label": t('settings.search'), value: query, onChange: e => handleQueryChange(e.target.value) }) })] }));
}
//# sourceMappingURL=SettingsNavHeader.js.map