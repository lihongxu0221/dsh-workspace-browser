/** 业务 REST 的状态错误；先判断 HTTP 状态，避免空响应体掩盖认证失败。 */
import type { WorkspaceUiKey } from './workspace-ui-locales.ts';
export declare class BusinessRequestError extends Error {
    readonly status: number;
    constructor(status: number);
}
export declare function businessRequestErrorKey(error: unknown): WorkspaceUiKey | undefined;
//# sourceMappingURL=business-request-error.d.ts.map