import { CODEX_UI_API_ENDPOINTS } from "./business-api.js";
import { isSubPluginDisabledOnDisk as checkDisabledOnDisk } from "./profile-resolver.js";
import { apply as applyPredictions } from "./composer-prediction.js";
import { collectModelCatalog } from "./composer-models.js";
export const name = 'workspace-browser-composer';
export const inject = ['webServer', 'llm'];
export function isSubPluginDisabledOnDisk(id, homeDir, ctx) {
    return checkDisabledOnDisk(id, homeDir, ctx);
}
/** 严格读取配置：只有显式 `false` 才关闭，其余（含未声明、类型错误）一律视为开启。 */
export function resolvePredictionAllowed(config) {
    if (config === null || typeof config !== 'object')
        return true;
    return config.prediction !== false;
}
/**
 * Composer 输入框增强子组件 (Host 侧)
 * 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态 + 预测开关状态)
 * 2. 暴露 /composer/prediction 与 /composer/prediction/stream (流式预测)
 */
export function apply(ctx, config) {
    const statusEndpoint = CODEX_UI_API_ENDPOINTS.composer;
    const predictionAllowed = resolvePredictionAllowed(config);
    // 1. 注册标准预测引擎（对齐成熟参考插件）；站点级关闭时完全不注册，也就不可能产生模型调用
    ctx.effect(() => {
        const disabled = isSubPluginDisabledOnDisk('workspace-browser-composer', undefined, ctx);
        if (disabled || !predictionAllowed)
            return () => { };
        applyPredictions(ctx, config);
        return () => { };
    }, 'michengai-codex-ui: composer predictions engine');
    // 2. 状态端点
    ctx.effect(() => {
        const webServer = ctx.webServer ?? ctx.get?.('webServer');
        if (!webServer || typeof webServer.register !== 'function')
            return () => { };
        const disposeStatus = webServer.register({
            kind: 'exact',
            path: statusEndpoint,
            handler: (_request, response) => {
                const disabled = isSubPluginDisabledOnDisk('workspace-browser-composer', undefined, ctx);
                response.writeHead(200, {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'no-store',
                });
                response.end(JSON.stringify({ enabled: !disabled, prediction: predictionAllowed }));
            },
        });
        const disposeModels = webServer.register({
            kind: 'exact',
            path: CODEX_UI_API_ENDPOINTS.composerModels,
            handler: async (_request, response) => {
                try {
                    const providers = await collectModelCatalog(ctx);
                    response.writeHead(200, {
                        'content-type': 'application/json; charset=utf-8',
                        'cache-control': 'no-store',
                    });
                    response.end(JSON.stringify({ ok: true, providers }));
                }
                catch (error) {
                    response.writeHead(500, {
                        'content-type': 'application/json; charset=utf-8',
                        'cache-control': 'no-store',
                    });
                    response.end(JSON.stringify({ ok: false, error: String(error) }));
                }
            },
        });
        return () => {
            disposeStatus?.();
            disposeModels?.();
        };
    }, 'michengai-codex-ui: composer state');
}
//# sourceMappingURL=composer-plugin.js.map