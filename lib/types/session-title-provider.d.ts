import { type SessionTitleLocale, type SessionTitleTarget } from './session-title.ts';
export declare const SESSION_TITLE_PROVIDER_ID = "workspace-browser-session-title";
export type SessionTitleHost = {
    get: (name: string) => unknown;
    loader?: unknown;
    logger?: {
        warn: (message: string, ...args: unknown[]) => void;
    };
};
type TitleRoute = {
    provider: string;
    model: string;
};
type TitleRequest = {
    session?: SessionTitleTarget & {
        header?: SessionTitleTarget['header'] & {
            createdAt?: number;
        };
    };
    messages?: readonly {
        seq?: number;
        text?: string;
    }[];
    route?: TitleRoute;
    signal?: AbortSignal;
};
type TitleLlm = {
    stream: (options: Record<string, unknown>) => AsyncIterable<unknown>;
    prepareCall?: (route: {
        provider: string;
        model: string;
        maxTokens?: number;
    }, signal?: AbortSignal, selector?: (controls: Record<string, unknown>, model: {
        reasoning?: {
            efforts?: {
                id: string;
            }[];
        };
    }) => Record<string, unknown>) => Promise<{
        config: Record<string, unknown>;
        stream: (options: Record<string, unknown>) => AsyncIterable<unknown>;
    }>;
};
export declare function generateCodexSessionTitle(llm: TitleLlm, request: TitleRequest, locale?: SessionTitleLocale): Promise<{
    title: string;
    messageSeqs: number[];
    model?: TitleRoute;
}>;
export type SessionTitleDisposer = () => void | Promise<void>;
export declare function registerSessionTitleProvider(ctx: SessionTitleHost): SessionTitleDisposer | undefined;
export {};
//# sourceMappingURL=session-title-provider.d.ts.map