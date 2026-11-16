import { type CodexUiKey } from './client/codex-locales.ts';
export declare const SESSION_TITLE_KINDS: readonly ["feature", "design", "fix", "optimize", "release", "explore", "docs", "research"];
export type SessionTitleKind = (typeof SESSION_TITLE_KINDS)[number];
export declare const SUPPORTED_SESSION_TITLE_LOCALES: readonly ["zh", "en", "ja", "es", "fr", "de", "ru", "pt"];
export type SessionTitleLocale = (typeof SUPPORTED_SESSION_TITLE_LOCALES)[number];
export declare const SESSION_TITLE_LOCALES: Record<SessionTitleLocale, Record<CodexUiKey, string>>;
export declare const SESSION_TITLE_SEPARATOR = "\uFF5C";
export declare const SESSION_TITLE_MAX_BYTES = 80;
export declare const SESSION_TITLE_EMOJI: {
    readonly feature: "✨";
    readonly design: "🎨";
    readonly fix: "🐛";
    readonly optimize: "⚡";
    readonly release: "🚀";
    readonly explore: "🔍";
    readonly docs: "📝";
    readonly research: "🔬";
};
export type SessionTitleParts = {
    type: SessionTitleKind;
    theme: string;
};
export type SessionTitleTarget = {
    id: string;
    origin?: string;
    header?: {
        createdAt?: number;
        parentSession?: string;
        origin?: string;
    };
};
export declare function sessionTitleTypeLabels(locale: SessionTitleLocale): string;
export declare function sessionTitlePrompt(locale: SessionTitleLocale): {
    system: string;
    userFrame: string;
};
export declare function parseLocaleValue(value: unknown): SessionTitleLocale | undefined;
/** 主题必须跟用户消息同一语言；模型串语言时改用消息原文。 */
export declare function alignThemeToMessage(theme: string, message: string): string;
export declare function resolveSessionTitleLocale(source: unknown, message?: string, fallbackSource?: unknown): SessionTitleLocale;
export declare function parseTypeAndTheme(raw: string): SessionTitleParts | undefined;
export declare function isRedundantTheme(type: string, theme: string): boolean;
export declare function assembleSessionTitle(type: string, theme: string, locale?: SessionTitleLocale): string | undefined;
export declare function shouldSkipAutoTitle(session: SessionTitleTarget): boolean;
//# sourceMappingURL=session-title.d.ts.map