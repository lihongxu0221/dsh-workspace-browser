import { buildPlan, type RestartKind } from './restart.ts';
/** 路由依赖；全部可注入，便于单测绕开真实进程。 */
export interface DesktopMenuRouteDeps {
    /** 子插件在 profile 里是否被显式停用。 */
    readonly isDisabled: () => boolean;
    /** 覆盖令牌（测试用）；缺省每次 Host 启动随机生成。 */
    readonly token?: string;
    readonly platform?: string;
    readonly execPath?: string;
    readonly env?: Record<string, string | undefined>;
    readonly paths?: {
        logPath: string;
        statePath: string;
    };
    /** Host 的父进程（Electron 主进程）PID；Windows 上被结束的就是它。 */
    readonly mainPid?: number;
    /** Host 自身 PID（主进程死后可能变孤儿，需要清理）。 */
    readonly hostPid?: number;
    readonly spawn?: (plan: ReturnType<typeof buildPlan>) => {
        ok: boolean;
        error?: string;
    };
}
/** 请求/响应的最小形状，避免把 node:http 的具体类型绑到测试里。 */
export interface RouteRequest {
    readonly method?: string;
    readonly url?: string;
    readonly headers: Record<string, string | string[] | undefined>;
}
export interface RouteResponse {
    writeHead: (status: number, headers?: Record<string, string>) => unknown;
    end: (body?: string) => unknown;
}
/** `Host` 头是否指向本机。 */
export declare function hostIsLoopback(host: string | undefined): boolean;
/** 常数时间比较两个令牌。 */
export declare function tokenMatches(expected: string, provided: string | undefined): boolean;
/**
 * 创建路由处理器。
 * @param deps - 子插件状态、平台信息与可注入的副作用。
 */
export declare function createDesktopMenuHandler(deps: DesktopMenuRouteDeps): (request: RouteRequest, response: RouteResponse) => Promise<void>;
/**
 * 不可重启的原因代码。
 * 只回机器码，文案由客户端按当前语言翻——Host 不知道用户界面是哪种语言。
 */
export type UnsupportedReason = 'desktop-only' | 'missing-app';
/** @returns 不能重启时的原因代码；能重启时为 undefined。 */
export declare function unsupportedReason(platform: string, kind: RestartKind): UnsupportedReason | undefined;
//# sourceMappingURL=desktop-menu-route.d.ts.map