import type { Context } from '@deepseek-ai/cordis';
export interface ModelReasoningEffort {
    id: string;
    name?: string;
    description?: string;
}
export interface ModelCatalogEntry {
    id: string;
    name?: string;
    description?: string;
    reasoning?: {
        efforts: ModelReasoningEffort[];
        defaultEffort?: string;
    } | null;
}
export interface ProviderCatalogEntry {
    id: string;
    name: string;
    models: ModelCatalogEntry[];
}
export declare function clearModelCatalogCache(): void;
/**
 * 收集当前宿主已配置的所有可用提供商与模型目录。
 * 遵循与 dsh-automation / dsh-im-connect 一致的提供商排序规范（官方置顶）。
 * 单模型推理信息探测附带超时保护，杜绝外部提供商异常挂死端点。
 */
export declare function collectModelCatalog(ctx: Context): Promise<ProviderCatalogEntry[]>;
//# sourceMappingURL=composer-models.d.ts.map