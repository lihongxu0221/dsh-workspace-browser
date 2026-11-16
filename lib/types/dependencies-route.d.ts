/**
 * Dependency catalog routes: installed state, npm download counts, single
 * install/update and update-all, all through the host plugin manager.
 *
 * The routes live on the same authenticated web server as the rest of the
 * plugin. Authentication reuses the connection service's request fence; a
 * missing fence is a hard 503 rather than an unauthenticated write path.
 */
import type { Context } from '@deepseek-ai/cordis';
type HostRequest = {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
};
/** Path scratches are not useful to a browser; keep our own explanations. */
export declare function publicDependencyError(error: unknown): string;
export declare class RequestBodyTooLargeError extends Error {
}
/** Read a small JSON body; the mutating calls never need more than 32 KiB. */
export declare function readRequestBody(request: HostRequest, maxBytes?: number): Promise<string>;
/** Register the catalog routes when the host exposes a web server. */
export declare function registerDependencyRoutes(ctx: Context): void;
export {};
//# sourceMappingURL=dependencies-route.d.ts.map