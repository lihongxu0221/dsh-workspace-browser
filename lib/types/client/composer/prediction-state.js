/**
 * 输入预测（ghost 建议）的用户级开关。
 *
 * 设计约束：
 * - **只影响预测**，不牵连 `↑`/`↓` 历史召回、宽度手柄、新会话建议卡片；
 * - 关闭后客户端**完全不发请求**，所以不产生任何辅助模型 token 花费（不需要 Host 侧再校验一次）；
 * - `hostAllowed` 来自 Host 状态端点：profile 的 `cordis.patch.yml` 给 `workspace-ui-composer`
 *   配 `config: { prediction: false }` 时会被置为 `false`，此时用户开关置灰（fail-closed，
 *   站点管理员意志优先，等价于主题子插件的 `subPluginEnabled` 语义）。
 */
export const PREDICTION_STORAGE_KEY = 'workspace-ui.composer.prediction';
/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
export const PREDICTION_STORAGE_EVENT = 'workspace-ui:prediction-change';
const listeners = new Set();
function safeGetItem(key) {
    try {
        if (typeof localStorage !== 'undefined')
            return localStorage.getItem(key);
    }
    catch {
        // 浏览器存储被禁用时按默认值处理，不影响输入本身
    }
    return null;
}
function safeSetItem(key, value) {
    try {
        if (typeof localStorage !== 'undefined')
            localStorage.setItem(key, value);
    }
    catch {
        // 写入失败只影响偏好持久化，本次会话内仍然生效
    }
}
export function parseStoredMode(raw) {
    if (raw === 'off' || raw === 'false' || raw === '0')
        return 'off';
    if (raw === 'continue')
        return 'continue';
    // 'all' / 'on' / 'true' / '1' 或未存储缺省值平滑兼容为 'all'
    return 'all';
}
let subPluginEnabled = true;
let currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
let hostAllowed = true;
function snapshot() {
    const effective = subPluginEnabled && hostAllowed && currentMode !== 'off';
    return {
        subPluginEnabled,
        userEnabled: currentMode !== 'off',
        mode: currentMode,
        hostAllowed,
        enabled: effective,
        nextEnabled: effective && currentMode === 'all',
        continueEnabled: effective && (currentMode === 'continue' || currentMode === 'all'),
    };
}
let cached = snapshot();
function publish() {
    const next = snapshot();
    if (next.subPluginEnabled === cached.subPluginEnabled &&
        next.userEnabled === cached.userEnabled &&
        next.mode === cached.mode &&
        next.hostAllowed === cached.hostAllowed &&
        next.enabled === cached.enabled &&
        next.nextEnabled === cached.nextEnabled &&
        next.continueEnabled === cached.continueEnabled) {
        return;
    }
    cached = next;
    for (const listener of [...listeners]) {
        try {
            listener();
        }
        catch {
            // 单个订阅者异常不能影响其余订阅者
        }
    }
}
/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
export function getPredictionSettingsState() {
    return cached;
}
export function subscribePredictionSettings(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
/** 当前是否应当请求预测；组件热路径用这个，避免每次分配对象。 */
export function isPredictionEnabled() {
    return cached.enabled;
}
export function setPredictionMode(mode) {
    currentMode = mode;
    safeSetItem(PREDICTION_STORAGE_KEY, mode);
    publish();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            window.dispatchEvent(new Event(PREDICTION_STORAGE_EVENT));
        }
        catch {
            // 事件派发失败不影响本地状态
        }
    }
}
/**
 * @deprecated 历史二态兼容入口，仅供旧用例过渡；生产侧请直接调用 setPredictionMode。
 * 保护用户已有细分模式：当从关闭状态重新打开且传入 true 时兜底切为 'all'；已处于开启状态（如 continue）时不重置为 all；关闭时切为 'off'。
 */
export function setPredictionEnabled(enabled) {
    if (!enabled) {
        setPredictionMode('off');
    }
    else if (currentMode === 'off') {
        setPredictionMode('all');
    }
}
/** Host 状态端点回报的配置位；缺省视为允许。 */
export function setHostPredictionAllowed(allowed) {
    hostAllowed = allowed;
    publish();
}
/** 标记 workspace-ui-composer 子插件在 Host 侧的启用状态；未启用时设置卡片不渲染（对齐主题卡片）。 */
export function setSubPluginEnabled(enabled) {
    subPluginEnabled = enabled;
    publish();
}
/** 测试用：按当前 localStorage 与默认 hostAllowed 重建内存状态。 */
export function refreshPredictionSettingsSnapshot() {
    currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
    cached = snapshot();
}
/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
export function observePredictionSettings() {
    if (typeof window === 'undefined')
        return () => { };
    const onStorage = (event) => {
        if (event.key !== null && event.key !== PREDICTION_STORAGE_KEY)
            return;
        currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
        publish();
    };
    const onLocal = () => {
        currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
        publish();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(PREDICTION_STORAGE_EVENT, onLocal);
    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(PREDICTION_STORAGE_EVENT, onLocal);
    };
}
//# sourceMappingURL=prediction-state.js.map