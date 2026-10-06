/**
 * Workspace picker plugin, node half. The browser keeps its viewing store in
 * localStorage, which a copied `.dsh` home does not include. This half stores
 * the extra-folder layer in that home so the copy carries it, behind the
 * connection's existing authenticated `/api` fence.
 */
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
interface HostContext {
    connection: {
        fetch: ConnectionFetch;
    };
}
/**
 * Register the folder-layer route for this plugin's lifetime.
 * @param ctx - host context carrying the connection Fetch registry.
 */
export declare function apply(ctx: HostContext): void;
export {};
//# sourceMappingURL=index.d.ts.map