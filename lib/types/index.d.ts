/**
 * Workspace picker plugin, node half. The browser keeps its viewing store in
 * localStorage, which a copied `.dsh` home does not include. This half stores
 * the extra-folder layer in that home so the copy carries it, behind the
 * connection's existing authenticated `/api` fence.
 *
 * It also turns that layer into prompt context: the shipped host has neither the
 * folder API nor a multi-root sandbox, so naming the folders is the only way a
 * Session learns about them.
 */
import { type SessionLike } from './session-folders.ts';
/** Required host service: the authenticated Fetch registry. */
export declare const inject: string[];
interface ConnectionFetch {
    register(route: {
        path: string;
        methods: readonly ('GET' | 'POST')[];
        requestBody: 'buffered';
        fetch: (request: Request) => Promise<Response>;
    }): () => Promise<void>;
}
/** The slice of the host's system-prompt registry this half uses. */
interface SystemPromptService {
    getContextOrder(name: string): number;
    context(entry: {
        name: string;
        order: number;
        text: (context: PromptContext) => string;
        interpolate?: boolean;
    }): void;
}
/** The context the host hands a prompt-context `text` function. */
interface PromptContext {
    agent?: {
        session?: SessionLike;
    };
}
interface HostContext {
    connection: {
        fetch: ConnectionFetch;
    };
    get(name: string): unknown;
    inject(names: readonly string[], callback: (scope: {
        systemPrompt: SystemPromptService;
    }) => void): void;
}
/**
 * Register the folder-layer route for this plugin's lifetime.
 * @param ctx - host context carrying the connection Fetch registry.
 */
export declare function apply(ctx: HostContext): void;
export {};
//# sourceMappingURL=index.d.ts.map