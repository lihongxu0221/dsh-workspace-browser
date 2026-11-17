import { alignThemeToMessage, assembleSessionTitle, parseTypeAndTheme, resolveSessionTitleLocale, sessionTitlePrompt, shouldSkipAutoTitle } from "./session-title.js";
export const SESSION_TITLE_PROVIDER_ID = 'workspace-ui-session-title';
const MAX_INPUT_BYTES = 4096;
const MAX_OUTPUT_TOKENS = 4096;
const TIMEOUT_MS = 60_000;
function isServiceValue(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
}
function asTitleService(value) {
    if (!isServiceValue(value))
        return undefined;
    const register = value.register;
    return typeof register === 'function' ? value : undefined;
}
function asLlm(value) {
    if (!isServiceValue(value))
        return undefined;
    const stream = value.stream;
    return typeof stream === 'function' ? value : undefined;
}
function abortableSignal(signal) {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    return signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
}
/**
 * Assemble the streamed text the way the host's `BlockAssembler` does: deltas
 * accumulate per block index and a closing `block-end` replaces them, so the
 * adapters that send both channels cannot duplicate the title text.
 */
function collectText(chunks) {
    return (async () => {
        const parts = new Map();
        let finish = 'stop';
        const part = (index) => {
            let existing = parts.get(index);
            if (existing === undefined) {
                existing = { text: '', closed: false };
                parts.set(index, existing);
            }
            return existing;
        };
        for await (const chunk of chunks) {
            if (chunk === null || typeof chunk !== 'object')
                continue;
            const row = chunk;
            if (row.type === 'tool-call-delta' || row.block?.type === 'tool-call')
                throw new Error('workspace-ui session title output must be text');
            if (row.type === 'finish') {
                finish = typeof row.reason?.kind === 'string' ? row.reason.kind : 'unknown';
                continue;
            }
            if (row.type !== 'text-delta' && row.type !== 'block-end')
                continue;
            if (typeof row.index !== 'number' || !Number.isSafeInteger(row.index))
                continue;
            if (row.type === 'text-delta') {
                if (typeof row.text !== 'string')
                    continue;
                const target = part(row.index);
                if (!target.closed)
                    target.text += row.text;
                continue;
            }
            if (row.block?.type !== 'text' || typeof row.block.text !== 'string')
                continue;
            const target = part(row.index);
            if (target.closed)
                continue;
            target.text = row.block.text;
            target.closed = true;
        }
        if (finish !== 'stop')
            throw new Error(`workspace-ui session title output finished with "${finish}"`);
        const text = [...parts.values()].map(segment => segment.text).join('').trim();
        return text.split(/\r?\n/, 1)[0] ?? '';
    })();
}
function hostLocale(host, message) {
    const settings = host.get('settings');
    const section = typeof settings?.get === 'function' ? settings.get('locale') : undefined;
    return resolveSessionTitleLocale(section, message, host.get('locale'));
}
export async function generateCodexSessionTitle(llm, request, locale = 'zh') {
    request.signal?.throwIfAborted();
    const session = request.session;
    if (session === undefined || shouldSkipAutoTitle(session))
        throw new Error('workspace-ui session title skipped');
    const first = request.messages?.[0];
    const text = first?.text?.trim() ?? '';
    if (first === undefined || text === '')
        throw new Error('workspace-ui session title missing message');
    const route = request.route;
    if (route === undefined || route.provider === '' || route.model === '')
        throw new Error('workspace-ui session title missing route');
    const prompt = sessionTitlePrompt(locale);
    const framed = `${prompt.userFrame}\n${JSON.stringify([{ seq: first.seq, text }])}`;
    if (Buffer.byteLength(framed, 'utf8') > MAX_INPUT_BYTES)
        throw new Error('workspace-ui session title input too large');
    const signal = abortableSignal(request.signal);
    const messages = [{
            id: crypto.randomUUID(),
            role: 'user',
            content: [{ type: 'text', text: framed }],
            source: { kind: 'plugin', plugin: 'workspace-ui' },
        }];
    let chunks;
    if (typeof llm.prepareCall === 'function') {
        const call = await llm.prepareCall({
            provider: route.provider,
            model: route.model,
            maxTokens: MAX_OUTPUT_TOKENS,
        }, signal, (controls, model) => ({
            ...controls,
            ...(model.reasoning?.efforts?.[0]?.id !== undefined ? { reasoningEffort: model.reasoning.efforts[0].id } : {}),
        }));
        chunks = call.stream({
            ...call.config,
            messages,
            system: prompt.system,
            sessionId: session.id,
            purpose: 'session-title',
            signal,
        });
    }
    else {
        chunks = llm.stream({
            provider: route.provider,
            model: route.model,
            messages,
            system: prompt.system,
            maxTokens: MAX_OUTPUT_TOKENS,
            sessionId: session.id,
            purpose: 'session-title',
            signal,
        });
    }
    const raw = await collectText(chunks);
    signal.throwIfAborted();
    const parsed = parseTypeAndTheme(raw);
    if (parsed === undefined)
        throw new Error('workspace-ui session title invalid model output');
    const title = assembleSessionTitle(parsed.type, alignThemeToMessage(parsed.theme, text), locale);
    if (title === undefined)
        throw new Error('workspace-ui session title rejected');
    return {
        title,
        messageSeqs: typeof first.seq === 'number' ? [first.seq] : [],
        model: route,
    };
}
export function registerSessionTitleProvider(ctx) {
    const sessionTitle = asTitleService(ctx.get('sessionTitle'));
    const llm = asLlm(ctx.get('llm'));
    if (sessionTitle === undefined || llm === undefined) {
        ctx.logger?.warn('Workspace UI 未能注册会话标题提供方：sessionTitle 或 llm 尚未就绪');
        return undefined;
    }
    try {
        const dispose = sessionTitle.register({
            id: SESSION_TITLE_PROVIDER_ID,
            automatic: 'first-prompt',
            generate: request => generateCodexSessionTitle(llm, request, hostLocale(ctx, request.messages?.[0]?.text)),
        });
        return typeof dispose === 'function' ? dispose : undefined;
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : typeof error;
        ctx.logger?.warn(`Workspace UI 未能注册会话标题提供方：${reason}`);
        return undefined;
    }
}
//# sourceMappingURL=session-title-provider.js.map