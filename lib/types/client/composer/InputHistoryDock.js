import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { InputHistory } from "./input-history.js";
import { getHistoryScope, observeHistoryScope, subscribeHistoryScope, } from "./history-scope.js";
import { hasDraftAttachments } from "./draft-attachments.js";
import { bindHistoryKeys, findComposer } from "./input-history-keyboard.js";
import { NS } from "../codex-locales.js";
export function InputHistoryHint({ t }) {
    // 跟随宿主占位元素的显隐和位置，避免占用工具栏或覆盖实际输入。
    return _jsx("style", { children: `
    [data-composer-card] [data-input-scroll]{container:dcu-composer-input / inline-size}
    [data-composer-card] [data-composer-placeholder]{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
    [data-composer-card] [data-composer-placeholder]::after{
      content:${JSON.stringify(t('input.historyHint'))};
      color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px;
      white-space:nowrap;flex:0 0 auto;margin-right:8px;
    }
    @container dcu-composer-input (max-width:560px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
    @media(max-width:640px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
  ` });
}
/** 隐形输入扩展：使用宿主状态和编辑动作，不替换编辑器或创建旁问界面。 */
export function InputHistoryDock({ ctx, sessionId, history, seen }) {
    const anchor = useRef(null);
    // 会话级（默认）只召回本会话输入；工作区级沿用旧行为，与同一 cwd 的会话共享。
    const scopeMode = useSyncExternalStore(subscribeHistoryScope, getHistoryScope, getHistoryScope);
    useEffect(() => {
        const sessions = ctx.get('sessions');
        const conversation = ctx.get('conversation');
        const inputTriggers = ctx.get('inputTriggers');
        if (sessions === undefined || conversation === undefined || inputTriggers === undefined)
            return;
        const binding = sessions.binding(sessionId);
        if (binding === undefined)
            return;
        const scope = scopeMode === 'workspace'
            ? sessions.list.getSnapshot().byId[sessionId]?.cwd ?? sessionId
            : sessionId;
        const input = conversation.input.for(binding.ctx);
        const menu = inputTriggers.sessionOf(binding.ctx).menu;
        // 挂载只建立版本基线，历史窗口和未挂载期间的输入不回灌；多实例共用版本去重。
        seen.set(binding, binding.eventSource.getSnapshot().revision);
        const collect = () => {
            const snapshot = binding.eventSource.getSnapshot();
            // 完整窗口替换可重设版本基线，兼容宿主重建窗口后计数归零；不回灌窗口内容。
            if (snapshot.change.kind !== 'replace' && snapshot.revision <= (seen.get(binding) ?? -1))
                return;
            seen.set(binding, snapshot.revision);
            if (snapshot.change.kind !== 'append')
                return;
            for (const entry of snapshot.change.entries) {
                if (entry.event.type !== 'user/message' || entry.event.data.source?.kind !== 'user')
                    continue;
                const text = entry.event.data.content.filter(block => block.type === 'text').map(block => block.text).join('');
                history.add(scope, text);
            }
        };
        const offEvents = binding.eventSource.subscribe(collect);
        let previous = input.state.getSnapshot();
        const offInput = input.state.subscribe(() => {
            const next = input.state.getSnapshot();
            // 宿主成功提交命令后才清空草稿并回到 plain；失败保留 claimed 和原文。
            if (previous.phase === 'submitting' && next.phase === 'plain' && next.draft === ''
                && !hasDraftAttachments(previous) && previous.occurrences.length === 0) {
                history.add(scope, previous.draft);
            }
            previous = next;
        });
        let editor;
        let offKeys = () => { };
        const connect = () => {
            const next = anchor.current === null ? undefined : findComposer(anchor.current);
            if (next === editor)
                return;
            offKeys();
            editor = next;
            if (editor === undefined)
                return;
            offKeys = bindHistoryKeys(editor, {
                draft: () => input.state.getSnapshot().draft,
                entries: () => history.list(scope),
                setDraft: text => input.setDraft(text),
                blocked: () => {
                    const state = input.state.getSnapshot();
                    return state.phase === 'adjudicating' || state.phase === 'submitting'
                        || hasDraftAttachments(state) || state.occurrences.length > 0 || menu.getSnapshot().open;
                },
            });
        };
        connect();
        const parent = anchor.current?.parentElement?.parentElement;
        const observer = new MutationObserver(connect);
        if (parent !== null && parent !== undefined)
            observer.observe(parent, { childList: true, subtree: true });
        return () => { observer.disconnect(); offKeys(); offInput(); offEvents(); };
    }, [ctx, sessionId, history, seen, scopeMode]);
    return _jsx("span", { ref: anchor, hidden: true });
}
export function registerInputHistory(ctx) {
    let storage;
    try {
        storage = window.localStorage;
    }
    catch {
        console.warn('[michengai-codex-ui] 浏览器存储不可用，使用内存输入历史。');
    }
    const history = new InputHistory(storage);
    const seen = new WeakMap();
    const stopScope = observeHistoryScope();
    function Dock(props) {
        return _jsx(InputHistoryDock, { ctx: ctx, sessionId: props.session.sessionId, history: history, seen: seen });
    }
    const unregisterDock = ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock', id: 'workspace-browser-input-history', order: 0,
    }, Dock));
    const unregisterHint = ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock', id: 'workspace-browser-input-history-hint', order: 1, locale: NS,
    }, InputHistoryHint));
    return () => {
        stopScope();
        unregisterDock();
        unregisterHint();
    };
}
//# sourceMappingURL=InputHistoryDock.js.map