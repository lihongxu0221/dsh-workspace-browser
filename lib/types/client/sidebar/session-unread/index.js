import { jsx as _jsx } from "react/jsx-runtime";
import { IconCheckCircleOutlineRegular, MenuItemButton, StateDot, } from '@deepseek-ai/dsh-client-ui-primitives';
import { NS } from "../../codex-locales.js";
import { canMarkSession, findSessionMenuButton, isSessionArchived, isSessionBusy, isSessionOpenInMainView, sessionIdOfRowKey, shouldShowSessionUnreadAction, unreadSetOf, writeSessionUnread, } from "./model.js";
/** 宿主会话行菜单槽位（行操作列表）。 */
const MENU_SLOT = 'sidebar.workspaces.session.menu.item';
/** 槽位内本子插件的行 id：命名空间化，避免与宿主行冲突。 */
const MENU_ITEM_ID = 'workspace-browser:session-unread';
/** 排在置顶（100）之后、重命名（200）之前。 */
const MENU_ORDER = 150;
/** 图标插槽 entryKey。 */
const ICON_UNREAD_KEY = 'workspace-browser:icon-session-unread';
const ICON_READ_KEY = 'workspace-browser:icon-session-read';
/**
 * 「标记为未读 / 标记为已读」菜单行。
 *
 * 宿主标准 hook 缺一环就整行不渲染：这是可选增强，绝不能让一个缺失的宿主能力
 * 把整份会话菜单拖垮。
 *
 * @param props - 宿主组合 props（见 {@link MarkUnreadMenuProps}）。
 * @returns 一行菜单项，或 null（未读不可写 / 已归档 / 正在主视图打开）。
 */
export function MarkUnreadMenuItem(props) {
    const { useMenuOpenState, useSessionStatus, useSessions, useWorkspaces } = props;
    if (typeof useMenuOpenState !== 'function' ||
        typeof useSessionStatus !== 'function' ||
        typeof useSessions !== 'function' ||
        typeof useWorkspaces !== 'function' ||
        typeof props.markUnread !== 'function' ||
        typeof props.markRead !== 'function') {
        return null;
    }
    return _jsx(MarkUnreadMenuRow, { ...props });
}
/**
 * 菜单行的渲染主体：hooks 必须无条件调用，因此与能力守卫拆成两个组件。
 *
 * @param props - 已确认具备全部宿主 hook 的组合 props。
 * @returns 菜单项或 null。
 */
function MarkUnreadMenuRow(props) {
    const { markRead, markUnread, sessionId, t } = props;
    const [, setMenuOpen] = props.useMenuOpenState();
    const unread = props.useSessionStatus(statuses => statuses.get(sessionId)?.completionUnread === true);
    const busy = props.useSessionStatus(statuses => isSessionBusy(statuses.get(sessionId)));
    const openInMainView = props.useSessions(list => isSessionOpenInMainView(list.byId[sessionId]));
    const archived = props.useWorkspaces(state => isSessionArchived(state.archivedSessionIds, sessionId));
    const canWrite = typeof props.canWrite === 'function' ? props.canWrite() : props.canWrite === true;
    if (!shouldShowSessionUnreadAction({
        canWrite,
        isUnread: unread,
        isArchived: archived,
        isOpenInMainView: openInMainView,
        isBusy: busy,
    })) {
        return null;
    }
    const select = (next) => {
        setMenuOpen(false);
        if (next)
            markUnread(sessionId);
        else
            markRead(sessionId);
    };
    if (unread) {
        return (_jsx(MenuItemButton, { icon: _jsx(IconCheckCircleOutlineRegular, { size: 16 }), onSelect: () => select(false), children: t('session.markRead') }));
    }
    return (_jsx(MenuItemButton, { icon: _jsx(StateDot, { state: "done", size: 10 }), onSelect: () => select(true), children: t('session.markUnread') }));
}
/**
 * 从客户端 Context 惰性读取宿主 `uiSession`。
 *
 * 故意不列入插件 inject：服务缺失时本能力整体降级，不影响插件其它功能加载；
 * 服务晚到时因为每次点击才读取，标记依然可用。
 *
 * @param ctx - 客户端插件 Context。
 * @returns 宿主服务的最小可用面或 undefined。
 */
function unreadHostOf(ctx) {
    try {
        const service = ctx.get?.('uiSession') ?? ctx.uiSession;
        if (service === null || typeof service !== 'object')
            return undefined;
        return service;
    }
    catch {
        return undefined;
    }
}
/**
 * 宿主是否自带右键菜单服务（0.2.2+ 把 `contextmenu` 绑定到了会话行本身）。
 */
function getNativeContextMenuService(ctx) {
    try {
        const service = ctx.get?.('contextMenus') ??
            ctx.contextMenus;
        if (service === null || typeof service !== 'object')
            return undefined;
        return service;
    }
    catch {
        return undefined;
    }
}
function hostOwnsContextMenu(ctx) {
    return typeof getNativeContextMenuService(ctx)?.open === 'function';
}
/**
 * 挂载会话未读能力。
 *
 * - DSH 0.2.2+：宿主拥有 contextMenus 服务，直接通过 contextMenus.register(..., order: 150)
 *   注入会话菜单，精准排在置顶（100）之后、重命名（200）之前；同时注入 contextMenu.icon。
 * - DSH 0.2.0 / 0.2.1：老版宿主无 contextMenus 服务，注册 sidebar.workspaces.session.menu.item
 *   并安装文档级 contextmenu 委托点击「···」锚点唤起菜单。
 *
 * @param ctx - 客户端插件 Context。
 * @returns 卸载函数（重复调用安全）。
 */
export function observeSessionUnread(ctx) {
    const slots = ctx.slots;
    let disposed = false;
    const markUnread = (sessionId) => writeSessionUnread(unreadHostOf(ctx), sessionId, true);
    const markRead = (sessionId) => writeSessionUnread(unreadHostOf(ctx), sessionId, false);
    const nativeContextMenus = getNativeContextMenuService(ctx);
    if (typeof nativeContextMenus?.register === 'function') {
        // 0.2.2+ 宿主：通过原生 contextMenus 服务注册，order 150 真正插在置顶（100）和重命名（200）之间
        let disposeUnreadIcon;
        let disposeReadIcon;
        if (slots !== undefined && typeof slots.inject === 'function' && typeof slots.register === 'function') {
            try {
                const u1 = slots.inject('contextMenu.icon', () => slots.register({ name: 'contextMenu.icon', key: ICON_UNREAD_KEY }, () => _jsx(StateDot, { state: "done", size: 10 })));
                if (typeof u1 === 'function')
                    disposeUnreadIcon = u1;
            }
            catch { }
            try {
                const u2 = slots.inject('contextMenu.icon', () => slots.register({ name: 'contextMenu.icon', key: ICON_READ_KEY }, () => _jsx(IconCheckCircleOutlineRegular, { size: 16 })));
                if (typeof u2 === 'function')
                    disposeReadIcon = u2;
            }
            catch { }
        }
        let unregNative;
        try {
            unregNative = nativeContextMenus.register({
                id: MENU_ITEM_ID,
                target: 'session',
                order: MENU_ORDER,
                observe: () => {
                    const uiSession = unreadHostOf(ctx);
                    const sessionStatus = uiSession?.sessionStatus;
                    return [ctx.locale, ...(sessionStatus?.subscribe ? [sessionStatus] : [])];
                },
                resolve: (target) => {
                    const sessionId = target?.sessionId;
                    if (!sessionId)
                        return [];
                    const unreadHost = unreadHostOf(ctx);
                    const canWrite = canMarkSession(unreadHost);
                    const unreadSet = unreadSetOf(unreadHost);
                    const isUnread = unreadSet?.has(sessionId) === true;
                    // 归档状态检查：已归档会话不渲染
                    let archived = false;
                    try {
                        const workspaces = ctx.get?.('workspaces') ?? ctx.workspaces;
                        const snapshot = workspaces?.list?.getSnapshot?.() ?? workspaces?.getSnapshot?.();
                        archived = isSessionArchived(snapshot?.archivedSessionIds, sessionId);
                    }
                    catch { }
                    // 忙碌与主视图打开检查
                    let openInMainView = false;
                    let busy = false;
                    try {
                        const sessions = ctx.get?.('sessions') ?? ctx.sessions;
                        const list = sessions?.list?.getSnapshot?.() ?? sessions?.getSnapshot?.();
                        const sessionItem = list?.byId?.[sessionId] ?? list?.items?.find?.((s) => s.id === sessionId);
                        openInMainView = isSessionOpenInMainView(sessionItem);
                        const uiSession = unreadHost;
                        const statusMap = uiSession?.sessionStatus?.getSnapshot?.() ?? uiSession?.sessionStatus;
                        const status = statusMap instanceof Map
                            ? statusMap.get(sessionId)
                            : (statusMap?.[sessionId] ?? uiSession?.statusOf?.(sessionId));
                        busy = isSessionBusy(status, sessionItem);
                    }
                    catch { }
                    if (!shouldShowSessionUnreadAction({
                        canWrite,
                        isUnread,
                        isArchived: archived,
                        isOpenInMainView: openInMainView,
                        isBusy: busy,
                    })) {
                        return [];
                    }
                    const t = ctx.locale?.bind?.(NS) ?? ((k) => k);
                    if (isUnread) {
                        return [
                            {
                                id: 'mark-read',
                                label: t('session.markRead'),
                                icon: { key: ICON_READ_KEY },
                                run: () => {
                                    markRead(sessionId);
                                },
                            },
                        ];
                    }
                    return [
                        {
                            id: 'mark-unread',
                            label: t('session.markUnread'),
                            icon: { key: ICON_UNREAD_KEY },
                            run: () => {
                                markUnread(sessionId);
                            },
                        },
                    ];
                },
            });
        }
        catch (error) {
            console.warn('[codex-ui:session-unread] 注册原生 contextMenus 失败，跳过。', error);
        }
        return () => {
            if (disposed)
                return;
            disposed = true;
            if (typeof unregNative === 'function') {
                try {
                    unregNative();
                }
                catch { }
            }
            if (typeof disposeUnreadIcon === 'function') {
                try {
                    disposeUnreadIcon();
                }
                catch { }
            }
            if (typeof disposeReadIcon === 'function') {
                try {
                    disposeReadIcon();
                }
                catch { }
            }
        };
    }
    // 0.2.0 / 0.2.1 老版宿主回退通道
    if (slots === undefined || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
        return () => { };
    }
    let disposeEntry;
    try {
        disposeEntry = slots.inject(MENU_SLOT, () => slots.register({
            name: MENU_SLOT,
            id: MENU_ITEM_ID,
            order: MENU_ORDER,
            locale: NS,
            inject: () => ({
                markUnread,
                markRead,
                canWrite: () => canMarkSession(unreadHostOf(ctx)),
            }),
        }, MarkUnreadMenuItem));
    }
    catch (error) {
        console.warn('[codex-ui:session-unread] 会话菜单项注册失败，已跳过。', error);
        return () => { };
    }
    const onContextMenu = (event) => {
        if (disposed || event.defaultPrevented)
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        if (target.closest("input, textarea, [contenteditable='true']") !== null)
            return;
        // 菜单浮层挂在 body 上：右键菜单内部时不要再弹一次。
        if (target.closest('[role="menu"]') !== null)
            return;
        const row = target.closest('[data-row-key]');
        if (row === null || sessionIdOfRowKey(row.getAttribute('data-row-key')) === undefined)
            return;
        // 0.2.2+：宿主自己把右键绑定到了会话行；再介入只会与它抢事件或把刚打开的菜单关掉。
        if (hostOwnsContextMenu(ctx) || row.querySelector('[data-context-menu-trigger]') !== null)
            return;
        // 有文字选区时保留浏览器原生菜单：用户可能只是想复制会话标题。
        const selection = typeof window.getSelection === 'function' ? window.getSelection() : null;
        if (selection !== null && selection.toString().trim() !== '')
            return;
        const menuButton = findSessionMenuButton(row);
        if (menuButton === null)
            return;
        event.preventDefault();
        menuButton.click();
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => {
        if (disposed)
            return;
        disposed = true;
        document.removeEventListener('contextmenu', onContextMenu, true);
        if (typeof disposeEntry !== 'function')
            return;
        try {
            disposeEntry();
        }
        catch {
            // 宿主已卸载：注册账本随宿主一起消失，这里不必再报错。
        }
    };
}
//# sourceMappingURL=index.js.map