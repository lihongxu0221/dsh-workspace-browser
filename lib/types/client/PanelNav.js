import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Optional compact panel navigation for the Workspace sidebar.
 *
 * The reference plugin mounted an independent React root over the native
 * sidebar and hid the host's panel list. This fork keeps the host DOM intact:
 * the same `sidebar.panellist` entries are projected as a small, reorderable
 * strip above the Workspace list, and panel selection still goes through
 * `ctx.layout.selectPanel`. Panels pinned by the user stay visible; the rest
 * live behind a "more panels" accordion, mirroring the reference layout
 * without owning the native sidebar.
 */
import { useEffect, useMemo, useReducer, useState } from 'react';
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots';
import clsx from 'clsx';
import css from './rows/WorkspaceUI.module.css';
import { getClientContext } from "./runtime.js";
/** Project the registered sidebar panels into a stable, user-orderable list. */
function readPanels(order) {
    const ctx = getClientContext();
    if (ctx === undefined)
        return [];
    const seen = new Set();
    const items = [];
    for (const entry of ctx.slots.entriesOfSlot('sidebar.panellist')) {
        const id = entry.options.id ?? entry.options.key;
        if (id === undefined || seen.has(id))
            continue;
        seen.add(id);
        items.push({
            id,
            label: resolveSlotLabel(entry.options.label) ?? id,
        });
    }
    const rank = new Map(order.map((id, index) => [id, index]));
    return items.sort((a, b) => {
        const left = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const right = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return left - right;
    });
}
const PANEL_MIME = 'text/workspace-ui-panel';
export function PanelNav({ order, pinned, onOrder, onPinned, t }) {
    const [version, bump] = useReducer((value) => value + 1, 0);
    const [showMore, setShowMore] = useState(false);
    const ctx = getClientContext();
    useEffect(() => {
        if (ctx === undefined)
            return;
        return ctx.slots.subscribe('sidebar.panellist', bump);
    }, [ctx]);
    const panels = useMemo(() => readPanels(order), [ctx, order, version]);
    const active = ctx?.layout.panelInfo.getSnapshot().activePanelId ?? null;
    const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
    const pinnedItems = useMemo(() => panels.filter(panel => pinnedSet.has(panel.id)), [panels, pinnedSet]);
    const moreItems = useMemo(() => panels.filter(panel => !pinnedSet.has(panel.id)), [panels, pinnedSet]);
    useEffect(() => {
        if (active !== null && !pinnedSet.has(active))
            setShowMore(true);
    }, [active, pinnedSet]);
    if (ctx === undefined || panels.length === 0)
        return null;
    const setPinned = (id, shouldPin) => {
        const next = shouldPin
            ? [...pinned.filter(item => item !== id), id]
            : pinned.filter(item => item !== id);
        if (next.length === pinned.length && next.every((item, index) => item === pinned[index]))
            return;
        onPinned(next);
    };
    const move = (source, target, targetPinned) => {
        const ids = panels.map(panel => panel.id);
        const from = ids.indexOf(source);
        if (from < 0)
            return;
        ids.splice(from, 1);
        const to = target === null ? ids.length : ids.indexOf(target);
        ids.splice(to < 0 ? ids.length : to, 0, source);
        onOrder(ids);
        setPinned(source, targetPinned);
    };
    const zoneProps = (targetPinned) => ({
        onDragOver: (event) => {
            if (event.dataTransfer.types.includes(PANEL_MIME)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }
        },
        onDrop: (event) => {
            const source = event.dataTransfer.getData(PANEL_MIME);
            if (source === '')
                return;
            event.preventDefault();
            move(source, null, targetPinned);
        },
    });
    const itemProps = (panel, targetPinned) => ({
        draggable: true,
        onDragStart: (event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData(PANEL_MIME, panel.id);
        },
        onDragOver: (event) => {
            if (event.dataTransfer.types.includes(PANEL_MIME)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }
        },
        onDrop: (event) => {
            const source = event.dataTransfer.getData(PANEL_MIME);
            if (source === '' || source === panel.id)
                return;
            event.preventDefault();
            event.stopPropagation();
            move(source, panel.id, targetPinned);
        },
    });
    const renderItem = (panel, inPinned) => {
        const isPinned = pinnedSet.has(panel.id);
        return (_jsxs("span", { className: css.panelNavSlot, children: [_jsx("button", { type: "button", className: clsx(css.panelNavItem, active === panel.id && css.panelNavActive), title: panel.label, onClick: () => { ctx.layout.selectPanel(panel.id); }, ...itemProps(panel, inPinned), children: panel.label }), _jsx("button", { type: "button", className: css.panelNavPin, "aria-label": isPinned ? t('panels.unpin') : t('panels.pin'), title: isPinned ? t('panels.unpin') : t('panels.pin'), onClick: () => { setPinned(panel.id, !isPinned); }, children: isPinned ? '★' : '☆' })] }, panel.id));
    };
    return (_jsxs("nav", { className: css.panelNav, "aria-label": t('panels.toggle'), children: [_jsx("button", { type: "button", className: clsx(css.panelNavItem, active === null && css.panelNavActive), onClick: () => { ctx.layout.selectPanel(null); }, children: t('panels.conversation') }), _jsx("span", { className: css.panelNavGroup, ...zoneProps(true), children: pinnedItems.map(panel => renderItem(panel, true)) }), moreItems.length > 0 && (_jsxs("button", { type: "button", className: clsx(css.panelNavMoreToggle, showMore && css.panelNavMoreOpen), "aria-expanded": showMore, onClick: () => { setShowMore(value => !value); }, children: [t('panels.more'), " (", moreItems.length, ")"] })), showMore && moreItems.length > 0 && (_jsx("span", { className: css.panelNavGroup, ...zoneProps(false), children: moreItems.map(panel => renderItem(panel, false)) }))] }));
}
//# sourceMappingURL=PanelNav.js.map