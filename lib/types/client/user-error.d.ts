import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './workspace-ui-locales.ts';
type Translator = TranslateNS<typeof NS>;
/** 仅显式构造的本地化错误允许原样进入界面。 */
export declare class UserFacingError extends Error {
}
/** 将业务错误映射为当前语言，未知底层错误统一脱敏。 */
export declare function userErrorText(error: unknown, t: Translator): string;
/** 安装错误保留用户可执行的处理建议，但不直接展示 Host 原文。 */
export declare function installErrorText(error: unknown, t: Translator): string;
export {};
//# sourceMappingURL=user-error.d.ts.map