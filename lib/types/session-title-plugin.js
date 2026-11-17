import { startSessionTitleLifecycle } from "./session-title-lifecycle.js";
export const name = 'workspace-ui-session-title';
export const inject = ['sessionTitle', 'llm', 'loader'];
/** Register teardown before asynchronous official-provider draining. */
export function apply(ctx) {
    const lifecycle = startSessionTitleLifecycle(ctx);
    ctx.effect(() => lifecycle.dispose, 'workspace-ui: session title');
    return lifecycle.ready;
}
//# sourceMappingURL=session-title-plugin.js.map