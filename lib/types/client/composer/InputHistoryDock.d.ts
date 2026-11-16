import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { InputHistory } from './input-history.ts';
import { NS } from '../codex-locales.ts';
export declare function InputHistoryHint({ t }: PropsLocale<typeof NS>): import("react").JSX.Element;
type HistoryDockProps = {
    ctx: Context;
    sessionId: SessionId;
    history: InputHistory;
    seen: WeakMap<object, number>;
};
/** 隐形输入扩展：使用宿主状态和编辑动作，不替换编辑器或创建旁问界面。 */
export declare function InputHistoryDock({ ctx, sessionId, history, seen }: HistoryDockProps): import("react").JSX.Element;
export declare function registerInputHistory(ctx: Context): () => void;
export {};
//# sourceMappingURL=InputHistoryDock.d.ts.map