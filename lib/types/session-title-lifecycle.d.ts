import { type SessionTitleHost } from './session-title-provider.ts';
/** 不主动调用 loader.update 写盘；共享 options 仍可能被其他配置写入持久化。 */
export declare function startSessionTitleLifecycle(host: SessionTitleHost): {
    ready: Promise<void>;
    dispose: () => Promise<void>;
};
//# sourceMappingURL=session-title-lifecycle.d.ts.map