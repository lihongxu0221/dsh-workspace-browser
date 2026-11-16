import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './codex-locales.ts';
type ProgressPhase = 'resolving' | 'downloading' | 'linking' | 'building';
type InstallProgress = {
    active: boolean;
    target: string;
    seconds: number;
    lastLine: string;
    phase: ProgressPhase | null;
    done: number;
    total: number | null;
    percent: number | null;
    currentPackage: string | null;
};
export declare function isInstallProgress(value: unknown): value is InstallProgress;
/** Codex UI 的功能说明、配套管理插件状态与受限安装入口。 */
export declare function AboutSection(props: {
    t: TranslateNS<typeof NS>;
    close?: () => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AboutSection.d.ts.map