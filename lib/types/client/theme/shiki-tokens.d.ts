/**
 * 主题专属 Shiki 代码高亮 Token 映射字典
 * 为全套内置主题提供官方标准的代码语法高亮配色覆盖，
 * 包含关键字、字符串、函数、常量、注释、标点等核心语法着色。
 */
export type ShikiTokenName = '--shiki-foreground' | '--shiki-background' | '--shiki-token-constant' | '--shiki-token-string' | '--shiki-token-comment' | '--shiki-token-keyword' | '--shiki-token-parameter' | '--shiki-token-function' | '--shiki-token-string-expression' | '--shiki-token-punctuation' | '--shiki-token-link';
export type ShikiTokens = Record<ShikiTokenName, string>;
export declare const SHIKI_TOKENS_BY_THEME: Record<string, ShikiTokens>;
//# sourceMappingURL=shiki-tokens.d.ts.map