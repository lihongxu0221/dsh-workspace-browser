/**
 * 会话未读标记（会话行右键 →「标记为未读」）。
 *
 * 两个入口共用宿主的同一份会话菜单：
 * 1. 菜单行通过宿主槽位 `sidebar.workspaces.session.menu.item` 与「置顶 / 归档」并排；
 * 2. 右键入口按宿主能力分流：0.2.2+ 由宿主原生 `contextMenus` 直接绑定在会话行上；
 *    0.2.0 / 0.2.1 没有右键菜单，本模块点击行内「···」唤起同一份菜单，不另画浮层。
 *
 * 未读状态直接写宿主 `uiSession`（见 ./model.ts）：行首绿点、悬浮卡状态与侧栏水位线
 * 都由宿主自己负责，与「会话跑完」的未读语义完全一致。标记只在本次页面生命周期内有效，
 * 与宿主内置未读提醒一样不跨刷新持久化。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import React from 'react';
/** 会话 UI 状态里本能力用到的字段。 */
interface SessionStatusLike {
    readonly running?: boolean;
    readonly completionUnread?: boolean;
    readonly pendingInteraction?: unknown;
}
/** 会话列表行里判断「是否正在主视图打开」的最小形状。 */
interface SessionSummaryLike {
    readonly retainedBy?: {
        readonly mainView?: number;
    };
}
interface SessionListLike {
    readonly byId: Readonly<Record<string, SessionSummaryLike | undefined>>;
}
interface WorkspaceSnapshotLike {
    readonly archivedSessionIds: readonly string[];
}
/** 宿主标准选择器 hook 的最小签名（只用到布尔结果）。 */
type SelectorHook<State> = (selector: (state: State) => boolean) => boolean;
/** 会话菜单行收到的 props：owner share + 全局标准 hook + 本子插件注入的动作。 */
export interface MarkUnreadMenuProps {
    /** 行所属会话 id（宿主 owner share）。 */
    sessionId: string;
    /** 绑定到本子插件命名空间的翻译函数。 */
    t: (key: string) => string;
    /** 写入未读标记；宿主契约不可用时返回 false。 */
    markUnread: (sessionId: string) => boolean;
    /** 清除未读标记；宿主契约不可用时返回 false。 */
    markRead: (sessionId: string) => boolean;
    /** 宿主未读能力是否可写；契约漂移时为 false 或返回 false。 */
    canWrite?: boolean | (() => boolean);
    useMenuOpenState?: () => readonly [open: boolean, setOpen: (open: boolean) => void];
    useSessionStatus?: SelectorHook<ReadonlyMap<string, SessionStatusLike>>;
    useSessions?: SelectorHook<SessionListLike>;
    useWorkspaces?: SelectorHook<WorkspaceSnapshotLike>;
}
/**
 * 「标记为未读 / 标记为已读」菜单行。
 *
 * 宿主标准 hook 缺一环就整行不渲染：这是可选增强，绝不能让一个缺失的宿主能力
 * 把整份会话菜单拖垮。
 *
 * @param props - 宿主组合 props（见 {@link MarkUnreadMenuProps}）。
 * @returns 一行菜单项，或 null（未读不可写 / 已归档 / 正在主视图打开）。
 */
export declare function MarkUnreadMenuItem(props: MarkUnreadMenuProps): React.JSX.Element | null;
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
export declare function observeSessionUnread(ctx: ClientContext): () => void;
export {};
//# sourceMappingURL=index.d.ts.map