import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { WORKSPACE_UI_API_ENDPOINTS } from "../../business-api.js";
import { IconChevronDownOutlineMedium } from "../host-icons.js";
import { getPredictionRoute, setPredictionRoute, subscribePredictionRoute, } from "./prediction-route-state.js";
let cachedProviders = null;
export function clearClientModelCache() {
    cachedProviders = null;
}
/**
 * 智能输入预测模型选择器（单字段级联选择组件）
 * 对齐官方 Chat 式单字段交互：
 * - 紧凑单字段展示；
 * - 默认「跟随当前会话」；
 * - 下拉通过 Menu Submenu 支持推理模型档位级联点选。
 */
export function PredictionModelPicker({ t, disabled = false }) {
    const currentRoute = useSyncExternalStore(subscribePredictionRoute, getPredictionRoute, getPredictionRoute);
    const [open, setOpen] = useState(false);
    const [providers, setProviders] = useState(() => cachedProviders ?? []);
    useEffect(() => {
        if (!open)
            return;
        if (cachedProviders !== null) {
            setProviders(cachedProviders);
            return;
        }
        let cancelled = false;
        fetch(WORKSPACE_UI_API_ENDPOINTS.composerModels)
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
            if (cancelled || !data?.ok || !Array.isArray(data.providers))
                return;
            cachedProviders = data.providers;
            setProviders(data.providers);
        })
            .catch(() => {
            // 容错降级
        });
        return () => {
            cancelled = true;
        };
    }, [open]);
    const handleSelect = (id) => {
        setOpen(false);
        if (id === '__follow_session__') {
            setPredictionRoute(null);
            return;
        }
        if (id.startsWith('model::')) {
            const [, p, m] = id.split('::');
            if (p && m) {
                setPredictionRoute({ provider: p, model: m });
            }
            return;
        }
        if (id.startsWith('effort::')) {
            const [, p, m, eff] = id.split('::');
            if (p && m) {
                if (eff === '__auto__') {
                    setPredictionRoute({ provider: p, model: m });
                }
                else {
                    setPredictionRoute({ provider: p, model: m, reasoningEffort: eff });
                }
            }
        }
    };
    // 计算当前触发器展示文本
    const triggerText = (() => {
        if (!currentRoute || !currentRoute.provider || !currentRoute.model) {
            return t('composer.modelFollowSession') || '跟随当前会话 (默认)';
        }
        let foundModelName = currentRoute.model;
        for (const p of providers) {
            if (p.id === currentRoute.provider) {
                const m = p.models.find(item => item.id === currentRoute.model);
                if (m?.name)
                    foundModelName = m.name;
                break;
            }
        }
        if (currentRoute.reasoningEffort) {
            return `${foundModelName} · ${currentRoute.reasoningEffort}`;
        }
        return foundModelName;
    })();
    // 计算选中的 ID
    const selectedId = (() => {
        if (!currentRoute || !currentRoute.provider || !currentRoute.model) {
            return '__follow_session__';
        }
        if (currentRoute.reasoningEffort) {
            return `effort::${currentRoute.provider}::${currentRoute.model}::${currentRoute.reasoningEffort}`;
        }
        for (const p of providers) {
            if (p.id === currentRoute.provider) {
                const m = p.models.find(item => item.id === currentRoute.model);
                if (m?.reasoning?.efforts && m.reasoning.efforts.length > 0) {
                    return `effort::${currentRoute.provider}::${currentRoute.model}::__auto__`;
                }
                break;
            }
        }
        return `model::${currentRoute.provider}::${currentRoute.model}`;
    })();
    // 构建菜单项
    const items = [
        {
            id: '__follow_session__',
            label: t('composer.modelFollowSession') || '跟随当前会话 (默认)',
        },
    ];
    if (providers.length > 0) {
        items.push({ type: 'separator', id: 'sep_follow' });
        for (const p of providers) {
            items.push({ type: 'label', id: `group_${p.id}`, text: p.name });
            for (const m of p.models) {
                const efforts = m.reasoning?.efforts ?? [];
                if (efforts.length === 0) {
                    // 普通模型：叶子节点
                    items.push({
                        id: `model::${p.id}::${m.id}`,
                        label: m.name || m.id,
                    });
                }
                else {
                    // 推理模型：挂载子菜单
                    const submenuEntries = [
                        {
                            id: `effort::${p.id}::${m.id}::__auto__`,
                            label: t('composer.effortAuto') || '自动最低档 (推荐)',
                        },
                    ];
                    for (const eff of efforts) {
                        submenuEntries.push({
                            id: `effort::${p.id}::${m.id}::${eff.id}`,
                            label: eff.name ? `${eff.name} (${eff.id})` : eff.id,
                        });
                    }
                    items.push({
                        id: `model_parent::${p.id}::${m.id}`,
                        label: m.name || m.id,
                        submenu: submenuEntries,
                    });
                }
            }
        }
    }
    const triggerButton = (_jsxs(Button, { variant: "outline", size: "sm", disabled: disabled, "aria-expanded": open, "aria-haspopup": "menu", className: `wui-prediction-model-trigger ${open ? 'is-open' : ''}`, onClick: () => {
            if (!disabled)
                setOpen(prev => !prev);
        }, children: [_jsx("span", { className: "wui-prediction-model-label", title: triggerText, children: triggerText }), _jsx(IconChevronDownOutlineMedium, { size: 12, className: `wui-prediction-model-arrow ${open ? 'is-rotated' : ''}` })] }));
    return (_jsxs("div", { className: "wui-prediction-model-picker-root", children: [_jsx("style", { children: `
        .wui-prediction-model-picker-root {
          display: inline-flex;
          align-items: center;
          position: relative;
        }
        .wui-prediction-model-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          min-width: 140px;
          max-width: 280px;
          height: 32px;
          padding: 0 10px;
          font-size: 13px;
          border-radius: 6px;
        }
        .wui-prediction-model-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1 1 auto;
          text-align: left;
        }
        .wui-prediction-model-arrow {
          flex: 0 0 auto;
          transition: transform 150ms ease;
          opacity: 0.7;
        }
        .wui-prediction-model-arrow.is-rotated {
          transform: rotate(180deg);
        }
      ` }), _jsx(Menu, { open: open, anchor: triggerButton, items: items, selectedId: selectedId, onClose: () => setOpen(false), onSelect: handleSelect, portal: true, dense: true, align: "end" })] }));
}
//# sourceMappingURL=PredictionModelPicker.js.map