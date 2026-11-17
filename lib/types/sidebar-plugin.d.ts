import type { Context } from '@deepseek-ai/cordis';
export declare const name = "workspace-ui-sidebar";
export declare const inject: string[];
/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
 * 与 composer / settings-skin 保持一致：停用后端点如实回报，客户端回退官方侧栏。
 */
export declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean;
/**
 * 侧栏导航子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/michengai/dsh-workspace-ui/sidebar；
 * 停用此子组件或端点不可达时，客户端关闭增强并回退 DSH 官方侧栏。
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=sidebar-plugin.d.ts.map