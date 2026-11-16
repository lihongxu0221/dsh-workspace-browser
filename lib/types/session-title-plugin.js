import { startSessionTitleLifecycle } from "./session-title-lifecycle.js";
export const name = 'workspace-browser-session-title';
export const inject = ['sessionTitle', 'llm', 'loader'];
/** Register teardown before asynchronous official-provider draining. */
export function apply(ctx) {
    const lifecycle = startSessionTitleLifecycle(ctx);
    ctx.effect(() => lifecycle.dispose, 'michengai-codex-ui: session title');
    return lifecycle.ready;
}
//# sourceMappingURL=session-title-plugin.js.map