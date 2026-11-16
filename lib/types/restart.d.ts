/** 退出后重新拉起的方式，决定助手脚本走哪条分支。 */
export type RestartKind = 'win' | 'mac' | 'linux' | 'node';
/** 当前进程所属的桌面应用，以及它能否被重启。 */
export interface AppTarget {
    readonly platform: string;
    readonly kind: RestartKind;
    readonly appPath: string;
    readonly execPath: string;
    readonly imageName: string;
    readonly canRestart: boolean;
}
/**
 * 判断当前进程是不是「桌面应用本体」，并给出重启需要的路径。
 *
 * - macOS：从 `nodeProcess.execPath` 里找 `.app/Contents/MacOS/`。
 * - Windows：可执行文件是 `.exe` 且不是 `node.exe` / `electron.exe`。
 * - Linux：优先用 AppImage 自带的 `APPIMAGE`；否则 execPath 不是 node/electron 就当桌面程序。
 * - 纯 `dsh web`（execPath 是 node）一律不可重启，`canRestart=false`。
 */
export declare function detectApp(input?: {
    platform?: string;
    execPath?: string;
    env?: Record<string, string | undefined>;
}): AppTarget;
/** 助手脚本执行时要的一切，序列化后塞进脚本本身。 */
export interface RestartPlan {
    readonly platform: string;
    readonly kind: RestartKind;
    readonly appPath: string;
    readonly imageName: string;
    readonly appId: string;
    /** 进程扫描用的命令行特征（macOS/Linux）。 */
    readonly match: string;
    readonly logPath: string;
    readonly statePath: string;
    /** Electron 主进程 PID（Host 的父进程）；Windows 上要结束的就是它。 */
    readonly mainPid: number;
    /** 本插件所在的 Host 进程 PID；主进程死后它可能变成孤儿，需要显式清理。 */
    readonly hostPid: number;
    /** 本次 Host 启动的标识，用来丢弃上一次运行留下的状态文件。 */
    readonly bootId: string;
    readonly quitTimeoutMs: number;
    readonly openDelayMs: number;
}
/** 把平台差异拍成一份纯数据计划。 */
export declare function buildPlan(app: AppTarget, options: {
    logPath: string;
    statePath?: string;
    mainPid?: number;
    hostPid?: number;
    bootId?: string;
    quitTimeoutMs?: number;
    openDelayMs?: number;
}): RestartPlan;
/**
 * 生成助手脚本（CommonJS，交给 Electron 自带的 Node 执行）。
 *
 * 为什么不写成 bat / ps1：三个平台用同一套逻辑最省事，而 `nodeProcess.execPath` +
 * `ELECTRON_RUN_AS_NODE=1` 可以借用应用自带的 Node，用户机器上不需要另装 Node。
 */
export declare function helperSource(plan: RestartPlan): string;
/** 把助手脚本写进临时目录并交给 Electron 的 Node 跑起来（脱离本进程）。 */
export declare function spawnHelper(plan: RestartPlan): {
    ok: boolean;
    error?: string;
    scriptPath?: string;
};
/** 默认日志与状态文件位置。 */
export declare function defaultPaths(): {
    logPath: string;
    statePath: string;
};
//# sourceMappingURL=restart.d.ts.map