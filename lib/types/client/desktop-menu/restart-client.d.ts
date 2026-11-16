/** Host 返回的状态文档。 */
export interface RestartStatus {
    readonly enabled?: boolean;
    readonly canRestart: boolean;
    readonly reason?: string;
    readonly platform: string;
    readonly kind: string;
    readonly appPath?: string;
    readonly token: string;
    readonly phase?: string;
    readonly detail?: string;
}
/** POST 的结果。 */
export interface RestartOutcome {
    readonly ok: boolean;
    readonly error?: string;
    readonly detail?: string;
    readonly reason?: string;
}
/** 读一次重启状态；网络/协议不可用时返回 null（调用方据此报「通道不可用」）。 */
export declare function fetchRestartStatus(): Promise<RestartStatus | null>;
/** 带着令牌请求重启。 */
export declare function requestRestart(token: string): Promise<RestartOutcome>;
/** 进度卡片用到的文案。 */
export interface RestartCopy {
    readonly quitting: string;
    readonly relaunched: string;
    readonly cancelled: string;
    readonly launchFailed: string;
    readonly timeout: string;
    readonly close: string;
    readonly failed: string;
    readonly busy: string;
}
/** 一张可复用的重启提示卡；progress 状态会一直挂着等页面被重启带走。 */
export interface RestartToast {
    set: (title: string, body?: string, tone?: 'info' | 'error') => void;
}
/**
 * 显示重启提示卡。
 * @param copy - 当前语言文案。
 */
export declare function showRestartToast(copy: RestartCopy): RestartToast;
/**
 * 重启后盯住阶段：页面通常会在应用退出时被带走，所以这里只是尽量把结果说清楚。
 * @param toast - 提示卡。
 * @param copy - 文案。
 * @param pollMs - 轮询间隔。
 * @param limitMs - 最长观察时间。
 */
export declare function watchRestart(toast: RestartToast, copy: RestartCopy, pollMs?: number, limitMs?: number): () => void;
//# sourceMappingURL=restart-client.d.ts.map