import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from '../workspace-ui-locales.ts';
export type SettingsSearchListener = (query: string) => void;
export declare function setSkinEnabledState(enabled: boolean): void;
export declare function subscribeSkinEnabledState(fn: (enabled: boolean) => void): () => void;
export declare function getNavSearchQuery(): string;
export declare function setNavSearchQuery(query: string): void;
export declare function subscribeNavSearch(fn: SettingsSearchListener): () => void;
export type SettingsNavHeaderProps = Partial<PropsRuntime<'settings.header'>> & Partial<PropsLocale<typeof NS>> & {
    t?: (key: string) => string;
};
export declare function SettingsNavHeader(props?: SettingsNavHeaderProps): import("react").JSX.Element;
//# sourceMappingURL=SettingsNavHeader.d.ts.map