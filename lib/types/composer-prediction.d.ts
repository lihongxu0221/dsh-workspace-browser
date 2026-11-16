/**
 * Host half of composer predictions (1:1 完整无损移植自 dsh-composer-predictions 1.2.8 原版源码)
 * 包含完整的 27 个处理函数、SSE 流式引擎、超时双重信号控制器与边界防护
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "composer-predictions";
export declare const inject: string[];
/**
 * Register both prediction endpoints.
 * @param ctx - context exposing llm, sessions, and the web server.
 * @param config - optional route, token, transcript, and candidate bounds.
 */
export declare function apply(ctx: Context, config?: any): void;
/** Prefer explicit client route first, then fixed host options route, then session route, then default model. */
declare function resolveRoute(ctx: any, session: any, options: any, clientRoute?: any): any;
declare function extractToolResultText(block: any): string;
/**
 * Render the conversation tail, recent tool activity, and (in continuation
 * mode) the draft as one bounded prompt.
 * @returns `null` when `next` mode has no completed assistant reply to follow.
 */
declare function buildPrompt(session: any, options: any, mode: string, draft: string): string | null;
/** Split model output into clean, de-duplicated, bounded candidates. */
declare function normalizeCandidates(text: string, maximum: number, draft: string, cue?: string): string[];
declare function boundSuggestion(line: string): string;
export { normalizeCandidates, boundSuggestion, buildPrompt, extractToolResultText, resolveRoute, };
//# sourceMappingURL=composer-prediction.d.ts.map