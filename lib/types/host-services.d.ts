import type { Context } from '@deepseek-ai/cordis';
type HttpRequest = {
    method?: string;
    url?: string;
    /** Node 原生请求头（小写键名），用于跨站请求判定。 */
    headers?: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
};
type HttpResponse = {
    writeHead: (status: number, headers?: Record<string, string>) => void;
    end: (body?: string) => void;
};
type HostServices = {
    webServer: {
        register: (route: {
            kind: 'exact';
            path: string;
            handler: (request: HttpRequest, response: HttpResponse) => Promise<void>;
        }) => () => void;
    };
};
/** 在唯一的宿主边界校验服务能力；宿主 API 变更时立即失败，不会静默返回 503。 */
export declare function hostServices(ctx: Context): HostServices;
export {};
//# sourceMappingURL=host-services.d.ts.map