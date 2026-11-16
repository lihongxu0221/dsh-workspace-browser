import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from '../codex-locales.ts';
import type { PrefillResult, DraftPresenceSource } from './new-conversation-draft.ts';
export type { PrefillResult } from './new-conversation-draft.ts';
/** 只向宿主标题容器贡献自己的 React portal，不搬动标题、工具条或编辑器。 */
export declare function NewConversationSuggestions({ t, prefill, draftSource }: PropsLocale<typeof NS> & {
    prefill?: (text: string) => PrefillResult;
    draftSource?: DraftPresenceSource;
}): import("react").ReactPortal | null;
export declare function SuggestionCards({ t, prefill, hasDraft }: PropsLocale<typeof NS> & {
    prefill?: (text: string) => PrefillResult;
    hasDraft?: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=NewConversationSuggestions.d.ts.map