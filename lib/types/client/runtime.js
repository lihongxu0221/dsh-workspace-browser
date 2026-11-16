let current;
/** Record the context that owns the mounted client tree. */
export function setClientContext(ctx) {
    current = ctx;
}
/** The current client context, if the plugin has been applied. */
export function getClientContext() {
    return current;
}
//# sourceMappingURL=runtime.js.map