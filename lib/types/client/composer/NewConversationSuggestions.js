import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Telescope, Hammer, ScanLine, Bug } from 'lucide-react';
const categories = [
    { id: 'explore', label: 'home.explore', tasks: [{ label: 'home.explore.task1', prompt: 'home.explore.prompt1' }, { label: 'home.explore.task2', prompt: 'home.explore.prompt2' }], Icon: Telescope, color: '#27aaff' },
    { id: 'build', label: 'home.build', tasks: [{ label: 'home.build.task1', prompt: 'home.build.prompt1' }, { label: 'home.build.task2', prompt: 'home.build.prompt2' }], Icon: Hammer, color: '#a478e8' },
    { id: 'review', label: 'home.review', tasks: [{ label: 'home.review.task1', prompt: 'home.review.prompt1' }, { label: 'home.review.task2', prompt: 'home.review.prompt2' }], Icon: ScanLine, color: '#44bd83' },
    { id: 'fix', label: 'home.fix', tasks: [{ label: 'home.fix.task1', prompt: 'home.fix.prompt1' }, { label: 'home.fix.task2', prompt: 'home.fix.prompt2' }], Icon: Bug, color: '#f48235' },
];
const hints = { workspace: 'home.workspace', draft: 'home.draft', busy: 'home.busy' };
const emptyDraft = { getSnapshot: () => false, subscribe: () => () => { } };
/** 寻找宿主新会话标语容器，支持任意环境下的多层级 DOM 结构 */
function findHeroStack(doc = document) {
    // 1. 如果有明确的 data-phase 且当前不是 hero 阶段（例如已进入对话流 active），绝不挂载建议卡片
    const phaseOwner = doc.querySelector('[data-phase]');
    if (phaseOwner && phaseOwner.getAttribute('data-phase') !== 'hero') {
        return null;
    }
    // 2. 经典选择器：匹配 [data-phase=hero] 或包含 _composerHero 的 stack
    const classic = doc.querySelector('[data-phase=hero] [class*="_composerHero"]>:first-child>[class$="_stack"]')
        ?? doc.querySelector('[data-phase=hero] [class*="host_composerHero"] [class*="host_stack"]')
        ?? doc.querySelector('[data-phase=hero] [class*="_stack"]');
    if (classic)
        return classic;
    // 3. 宿主真实 DOM 增强匹配：找 headline 或 fish 的父级 stack
    const headline = doc.querySelector('[class*="_headline"]');
    if (headline?.parentElement)
        return headline.parentElement;
    const fish = doc.querySelector('[class*="_fishHitbox"]');
    const stack = fish?.closest('[class*="_stack"]');
    if (stack)
        return stack;
    return doc.querySelector('[class*="_composerHero"] [class*="_stack"]')
        ?? doc.querySelector('[class*="pXSMma_stack"]');
}
/** 只向宿主标题容器贡献自己的 React portal，不搬动标题、工具条或编辑器。 */
export function NewConversationSuggestions({ t, prefill, draftSource = emptyDraft }) {
    const hasDraft = useSyncExternalStore(draftSource.subscribe, draftSource.getSnapshot, emptyDraft.getSnapshot);
    const [target, setTarget] = useState(null);
    useEffect(() => {
        const sync = () => setTarget(findHeroStack(document));
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'] });
        return () => observer.disconnect();
    }, []);
    return target === null ? null : createPortal(_jsx(SuggestionCards, { t: t, prefill: prefill, hasDraft: hasDraft }), target);
}
export function SuggestionCards({ t, prefill, hasDraft = false }) {
    const [selected, setSelected] = useState();
    const [hint, setHint] = useState('ready');
    function fill(text) {
        const result = prefill?.(text) ?? 'workspace';
        setHint(result);
        if (result === 'ready')
            document.querySelector('[data-phase=hero] [data-lexical-editor=true]')?.focus();
        if (result === 'workspace')
            document.querySelector('[data-phase=hero] [class*="_heroWorkspaceRow"]>button')?.click();
    }
    return _jsxs("section", { className: "dcu-home-suggestions", "data-has-draft": hasDraft, "aria-hidden": hasDraft, "aria-label": t('home.suggestions'), children: [_jsx("div", { className: "dcu-home-cards", children: categories.map(({ id, label, Icon, color }) => _jsxs("button", { type: "button", disabled: hasDraft, className: "dcu-home-card", style: { '--dcu-home-icon': color }, "aria-pressed": selected === id, onClick: () => { setSelected(selected === id ? undefined : id); setHint('ready'); }, children: [_jsx(Icon, { "aria-hidden": "true" }), _jsx("span", { children: t(label) })] }, id)) }), _jsx("div", { className: "dcu-home-details", children: categories.map(category => _jsx("div", { className: "dcu-home-tasks", "data-active": selected === category.id, "aria-hidden": selected !== category.id, children: category.tasks.map(task => _jsx("button", { type: "button", className: "dcu-home-task", disabled: hasDraft || selected !== category.id, onClick: () => fill(t(task.prompt)), children: t(task.label) }, task.label)) }, category.id)) }), _jsx("div", { className: "dcu-home-status", children: Object.keys(hints).map(key => _jsx("p", { className: "dcu-home-hint", "data-active": hint === key, "aria-hidden": hint !== key, role: hint === key ? 'status' : undefined, children: t(hints[key]) }, key)) })] });
}
//# sourceMappingURL=NewConversationSuggestions.js.map