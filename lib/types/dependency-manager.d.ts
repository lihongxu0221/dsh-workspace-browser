import { type ManagedDependencyId } from './dependencies.ts';
export declare const PROFILE_PENDING_UPDATES_FILE = ".dsh-pending-updates.json";
export type DependencyStatus = {
    id: ManagedDependencyId;
    packageName: string;
    installed: boolean;
    version?: string;
    latestVersion?: string;
    totalDownloads?: number;
    updateAvailable: boolean;
};
type OptionalServiceContext = {
    get?: (name: string) => unknown;
};
export type PluginManagerHostService = {
    installBundle?: (spec: string, options?: {
        requestId?: string;
        registry?: string;
        approvedBuilds?: string[];
    }) => Promise<unknown>;
    updateBundle?: (name: string, version: string, options?: {
        requestId?: string;
    }) => Promise<unknown>;
    listBundles?: () => Promise<{
        status: string;
        data?: Array<{
            name: string;
            version?: string;
            installed: boolean;
        }>;
    }>;
};
export type DependencyRuntime = {
    environmentKind: 'desktop' | 'cli';
    profileName: string;
    profileDir: string;
    runtimeRoots: readonly string[];
    /** 官方插件管理服务：全面由宿主原生处理依赖安装与版本升级。 */
    pluginManager?: PluginManagerHostService;
};
export type DependencyRuntimeOptions = {
    env?: NodeJS.ProcessEnv;
    argv?: readonly string[];
    cwd?: string;
    homeDir?: string;
};
/**
 * 运行时解析：优先通过宿主官方 profileContext 服务提取当前 Profile，
 * 不再自建 CLI 探测与包管理 spawn。
 */
export declare function resolveDependencyRuntime(ctx?: OptionalServiceContext, options?: DependencyRuntimeOptions): DependencyRuntime;
export declare function pluginsToRemoveBeforeInstall(declared: readonly string[], installingPackage: string): readonly string[];
export declare function resolveDshPluginTarget(installing: string, _declared: readonly string[]): string;
export declare function isOfficialRuntimePackage(packageName: string): boolean;
/** 卸载后残留的 node_modules 在 bundles 清除后不得继续标为已安装。 */
export declare function isManagedPackageInstalled(input: {
    installedVersion: string | undefined;
    declared: boolean;
}): boolean;
/** 旧 Suite 对其六个成员拥有声明权；迁移成直接依赖前也应显示真实安装版本。 */
export declare function isManagedPackageDeclared(packageName: string, declared: readonly string[]): boolean;
/** 更新旧 Suite 中任一成员时，必须一次提升全部成员，避免移除 Suite 后只剩一个插件。 */
export declare function directPackagesForInstall(requested: readonly string[], declared: readonly string[]): readonly string[];
export declare function newerVersion(installed: string, latest: string): boolean;
export declare function dependencyStatuses(runtime?: DependencyRuntime): Promise<readonly DependencyStatus[]>;
export type InstallProgressPhase = 'resolving' | 'downloading' | 'linking' | 'building';
export type InstallProgressView = {
    active: boolean;
    target: string;
    seconds: number;
    lastLine: string;
    phase: InstallProgressPhase | null;
    done: number;
    total: number | null;
    percent: number | null;
    currentPackage: string | null;
};
export declare function beginInstallProgress(target: string): void;
export declare function endInstallProgress(): void;
export declare function installProgressSnapshot(): InstallProgressView;
/** 接收宿主官方 plugin-manager/install-state 广播事件，对齐官方安装进度阶段。 */
export declare function noteHostInstallState(event: unknown): void;
export declare function noteInstallOutput(chunk: string): void;
export declare function installDependency(id: string | null, runtime?: DependencyRuntime): Promise<DependencyOperationResult>;
export type DependencyApplication = 'applied' | 'restart-required' | 'overridden' | 'failed' | 'cancelled';
export type DependencyOperationResult = {
    dependencies: readonly DependencyStatus[];
    application: DependencyApplication;
    updatedCount: number;
    results: readonly DependencyTargetResult[];
};
export type DependencyTargetError = {
    code?: string;
    diagnostic?: string;
    kind?: string;
    message?: string;
};
export type DependencyTargetResult = {
    packageName: string;
    application: DependencyApplication;
    changed: boolean | null;
    restartReason?: string;
    restore?: {
        application: DependencyApplication;
        changed: boolean;
    };
    error?: DependencyTargetError;
};
export type UpdateAllDependenciesResult = DependencyOperationResult;
/** 顶部批量操作同时安装缺失插件并更新落后版本。 */
export declare function updatableDependencyIds(statuses: readonly DependencyStatus[]): ManagedDependencyId[];
export declare function updateAllDependencies(runtime?: DependencyRuntime): Promise<UpdateAllDependenciesResult>;
export {};
//# sourceMappingURL=dependency-manager.d.ts.map