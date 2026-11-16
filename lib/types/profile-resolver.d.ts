import type { Context } from '@deepseek-ai/cordis';
export interface ProfileContextInfo {
    profileName: string;
    profileDir: string;
    homeDir: string;
}
/**
 * 健壮解析当前 DSH 实例的 Profile 信息：
 * 优先级：
 * 1. Cordis 服务 profileContext（官方运行时注入，最权威）
 * 2. 环境变量 DSH_PROFILE_DIR
 * 3. 命令行参数 --profile <name>
 * 4. 环境变量 DSH_PROFILE
 * 5. 兜底默认值 'web'
 */
export declare function resolveCurrentProfile(ctx?: Context, customHomeDir?: string): ProfileContextInfo;
/**
 * 严格基于当前 Profile 检查 cordis.patch.yml 中是否显式配置了 disabled: true。
 * 杜绝跨 Profile 串读（绝不扫描非当前 Profile 的目录）。
 */
export declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean;
//# sourceMappingURL=profile-resolver.d.ts.map