function requireService(ctx, key, method) {
    const service = ctx.get(key);
    if (service === null || typeof service !== 'object' || typeof service[method] !== 'function') {
        throw new Error(`workspace-ui 需要宿主服务 “${key}.${String(method)}”`);
    }
    return service;
}
/** 在唯一的宿主边界校验服务能力；宿主 API 变更时立即失败，不会静默返回 503。 */
export function hostServices(ctx) {
    return {
        webServer: requireService(ctx, 'webServer', 'register'),
    };
}
//# sourceMappingURL=host-services.js.map