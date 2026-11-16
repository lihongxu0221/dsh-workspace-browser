import { registerSessionTitleProvider, SESSION_TITLE_PROVIDER_ID } from "./session-title-provider.js";
const OFFICIAL_TARGETS = [
    { id: 'session-title-llm', name: '@deepseek-ai/dsh-session-title-first-prompt-llm' },
    { id: 'optional-session-title-all-prompts', name: '@deepseek-ai/dsh-session-title-all-prompts-llm' },
];
function isOfficialTarget(options) {
    if (!options)
        return false;
    return OFFICIAL_TARGETS.some(t => t.id === options.id && t.name === options.name);
}
const guardRegistry = new WeakMap();
function silenceOfficialProvider(host, shouldSilence) {
    const sessionTitle = host.get?.('sessionTitle');
    if (!sessionTitle || typeof sessionTitle.register !== 'function')
        return undefined;
    const target = Object.getPrototypeOf(sessionTitle);
    if (typeof target?.register !== 'function')
        return undefined;
    let state = guardRegistry.get(target);
    if (!state) {
        const original = target.register;
        const activeGuards = new Set();
        state = {
            original,
            activeGuards,
        };
        target.register = function (provider) {
            const candidate = provider;
            if (candidate && candidate.id !== SESSION_TITLE_PROVIDER_ID) {
                const active = [...state.activeGuards].some(g => g.shouldSilence());
                if (active) {
                    return () => { };
                }
            }
            return state.original.apply(this, arguments);
        };
        guardRegistry.set(target, state);
    }
    const guardHandle = { shouldSilence };
    state.activeGuards.add(guardHandle);
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        state.activeGuards.delete(guardHandle);
        if (state.activeGuards.size === 0) {
            target.register = state.original;
            guardRegistry.delete(target);
        }
    };
}
const transitions = new WeakMap();
function serialize(key, work) {
    const previous = transitions.get(key);
    const next = previous ? previous.catch(() => { }).then(work) : work();
    transitions.set(key, next);
    return next;
}
/** 不主动调用 loader.update 写盘；共享 options 仍可能被其他配置写入持久化。 */
export function startSessionTitleLifecycle(host) {
    let cancelled = false;
    let provider;
    let restore;
    let silencing = false;
    const restoreGuard = silenceOfficialProvider(host, () => silencing);
    const loader = host.loader;
    const candidates = typeof loader?.entries === 'function' ? [...loader.entries()].filter(entry => isOfficialTarget(entry.options)) : [];
    const key = candidates.length === 1 ? candidates[0] : host;
    const ready = serialize(key, async () => {
        if (typeof loader?.entries !== 'function')
            return;
        {
            const matches = [...loader.entries()].filter(entry => isOfficialTarget(entry.options));
            const enabledMatches = matches.filter(entry => !entry.disabled);
            if (enabledMatches.length === 1) {
                const entry = enabledMatches[0];
                if (typeof entry.update !== 'function' || typeof entry.fiber?.dispose !== 'function')
                    return;
                const options = entry.options;
                const original = options.disabled;
                const fiber = entry.fiber;
                // 身份变化会取消接管，但不应阻止撤回本实例写入的 disabled。
                // 条目移除、options 替换或禁用状态被并发修改时仍不覆盖。
                const ownsDisabledState = () => [...loader.entries()].includes(entry) && entry.options === options && options.disabled === true;
                const ownsEntry = () => ownsDisabledState() && isOfficialTarget(options);
                restore = async () => {
                    if (!ownsDisabledState())
                        return;
                    silencing = false;
                    await entry.update({ disabled: original ?? null });
                };
                try {
                    await entry.update({ disabled: true });
                }
                catch (error) {
                    if (ownsDisabledState()) {
                        await fiber.dispose();
                        await restore();
                    }
                    restore = undefined;
                    throw error;
                }
                // entry.update 会启动卸载但不等待，因此显式等待对应 fiber。
                await fiber.dispose();
                if (!ownsEntry()) {
                    // 排空期间身份发生变化，安全恢复官方条目以防两边都不工作
                    await restore();
                    restore = undefined;
                    return;
                }
            }
            else if (matches.length > 0 && enabledMatches.length === 0) {
                console.warn('[michengai-codex-ui] all official session title targets are already disabled; skipping takeover.');
                return;
            }
            else if (matches.length > 1) {
                console.warn('[michengai-codex-ui] multiple official session title targets found; skipping takeover.');
                return;
            }
        }
        if (!cancelled) {
            provider = registerSessionTitleProvider(host);
            if (provider)
                silencing = true;
        }
        if (!provider) {
            await restore?.();
            restore = undefined;
        }
    });
    let disposal;
    return {
        ready,
        dispose: () => {
            cancelled = true;
            silencing = false;
            const sessionTitle = host.get?.('sessionTitle');
            // 只有当前 registration 确实是由本实例注册的（id === SESSION_TITLE_PROVIDER_ID），才标记 closing，
            // 绝不误标记或删除第三方或官方的注册！
            if (sessionTitle?.registration?.provider?.id === SESSION_TITLE_PROVIDER_ID) {
                sessionTitle.registration.closing = true;
            }
            return disposal ??= serialize(key, async () => {
                try {
                    await ready.catch(() => { });
                    await provider?.();
                    provider = undefined;
                    if (sessionTitle?.registration?.provider?.id === SESSION_TITLE_PROVIDER_ID && sessionTitle.registration?.closing) {
                        delete sessionTitle.registration;
                    }
                }
                finally {
                    const guard = restoreGuard;
                    guard?.();
                    try {
                        await restore?.();
                    }
                    finally {
                        restore = undefined;
                    }
                }
            });
        },
    };
}
//# sourceMappingURL=session-title-lifecycle.js.map