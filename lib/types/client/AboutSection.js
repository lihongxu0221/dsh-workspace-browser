import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button as PrimitiveButton } from '@deepseek-ai/dsh-client-ui-primitives';
import { BusinessRequestError, businessRequestErrorKey } from "./business-request-error.js";
import { IconCheckOutlineMedium, IconDownloadOutlineMedium, IconListPenOutlineMedium, IconLoadingOutlineMedium, IconRefreshOutlineMedium } from "./host-icons.js";
import { CODEX_UI_API_ENDPOINTS } from "../business-api.js";
import { MANAGED_DEPENDENCIES } from "../dependencies.js";
import { installErrorText } from "./user-error.js";
import { ThemeSettingsCard } from "./theme/ThemeSettingsCard.js";
import { ComposerSettingsCard } from "./composer/ComposerSettingsCard.js";
import { getClientContext } from "./runtime.js";
const PROJECT_URL = 'https://github.com/lihongxu0221/dsh-workspace-browser';
const PROJECT_HOMEPAGES = Object.fromEntries(MANAGED_DEPENDENCIES.map(({ id, packageName }) => [
    id, id === 'market' ? 'https://dshmarket.com' : `https://github.com/MichengAI/${packageName.split('/')[1]}`,
]));
const openExternal = (url) => {
    window.open(url, '_blank', 'noreferrer'); // target="_blank" rel="noreferrer"
};
const PROGRESS_PHASES = new Set(['resolving', 'downloading', 'linking', 'building']);
const SUB_PLUGINS = [
    { id: 'composer', nameKey: 'about.feature.composer.name', descKey: 'about.feature.composer' },
    { id: 'settings-skin', nameKey: 'about.feature.settingsSkin.name', descKey: 'about.feature.settingsSkin' },
    { id: 'session-title', nameKey: 'about.feature.sessionTitle.name', descKey: 'about.feature.sessionTitle' },
    { id: 'sidebar', nameKey: 'about.feature.sidebar.name', descKey: 'about.feature.sidebar' },
    { id: 'theme', nameKey: 'about.feature.theme.name', descKey: 'about.feature.theme' },
    { id: 'desktop-menu', nameKey: 'about.feature.desktopMenu.name', descKey: 'about.feature.desktopMenu' },
    { id: 'dependencies', nameKey: 'about.feature.dependencies.name', descKey: 'about.feature.dependencies' },
];
const endpoint = CODEX_UI_API_ENDPOINTS.dependencies;
const stylesheet = `
.dcu-about{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);display:flex;flex-direction:column}
.dcu-about-head{display:flex;flex-direction:column;gap:6px;margin-bottom:2px}
.dcu-about-title-row{display:flex;align-items:center;gap:8px 12px;min-width:0;flex-wrap:wrap}
.dcu-about-title{margin:0;font-size:24px;line-height:32px;font-weight:600;letter-spacing:-.4px;color:var(--dsw-alias-label-primary);display:inline-flex;align-items:baseline;white-space:nowrap}
.dcu-about-desc{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dcu-about-feedback-links,.dcu-about-links{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;flex:0 0 auto}
.dcu-section-subtitle-wrap{margin-top:-4px;margin-bottom:4px}
.dcu-section-subtitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dcu-subplugins-list{display:flex;flex-direction:column;gap:6px}
.dcu-subplugin-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,0.03));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.06));border-radius:8px;transition:background-color 120ms ease}
.dcu-subplugin-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.05))}
.dcu-subplugin-header{display:inline-flex;align-items:center;gap:8px;flex:none}
.dcu-subplugin-name{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}
.dcu-subplugin-badge{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:14px;padding:2px 6px;border-radius:4px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,0.06))}
.dcu-subplugin-desc{margin:0;flex:1;min-width:0;text-align:right;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
@media(max-width:768px){
  .dcu-subplugin-item{flex-direction:column;align-items:flex-start;gap:4px}
  .dcu-subplugin-desc{text-align:left}
}
.dcu-section-card{box-sizing:border-box;display:flex;flex-direction:column;gap:16px;padding:18px 20px;background:var(--dsw-alias-bg-layer-2,#18181b);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.08));border-radius:12px;margin-bottom:16px;transition:border-color 0.15s ease,background-color 0.15s ease}
body:not([data-ds-dark-theme]) .dcu-section-card{background:var(--dsw-alias-bg-layer-2,#ffffff);border-color:var(--dsw-alias-border-l1,rgba(0,0,0,0.08))}
html[data-dsh-glass] .dcu-section-card{background:var(--dsw-alias-bg-layer-2,#18181b)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)}
html[data-dsh-glass] body:not([data-ds-dark-theme]) .dcu-section-card{background:var(--dsw-alias-bg-layer-2,#ffffff)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6)}
.dcu-section-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dcu-section-title-wrap{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.dcu-section-title{margin:0;font-size:15px;font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px}
.dcu-section-desc{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dcu-about-dependencies{overflow:hidden;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.08));border-radius:8px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,0.15))}
.dcu-about-dependency{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;padding:6px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.06));transition:background-color 120ms ease}
.dcu-about-dependency:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.04))}
.dcu-about-dependency:last-child{border-bottom:0}
.dcu-about-copy{min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:1px}
.dcu-about-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0;min-width:140px}
.dcu-about-name{font-size:13px;line-height:17px;font-weight:600}
.dcu-about-package{overflow:hidden;margin-top:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;text-overflow:ellipsis;white-space:nowrap}
.dcu-about-status{display:flex;align-items:center;gap:4px;font-size:12px;line-height:16px;white-space:nowrap;flex-shrink:0}
.dcu-about-status[data-installed=true]{color:var(--dsw-alias-state-success-primary)}
.dcu-about-status[data-installed=false]{color:var(--dsw-alias-state-error-primary)}
.dcu-about-status[data-update=true]{color:var(--dsw-alias-state-warning-primary)}
.dcu-about-progress{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:8px}
.dcu-about-progress-bar{flex:1;height:4px;background:var(--dsw-alias-border-l2);border-radius:2px;overflow:hidden}
.dcu-about-progress-fill{height:100%;background:var(--dsw-alias-brand-primary);transition:width 0.2s ease}
.dcu-about-message{padding:8px 12px;border-radius:6px;font-size:12px;margin-top:8px}
.dcu-about-message[data-error="true"]{color:var(--dsw-alias-state-error-primary,#ef4444);background:rgba(239,68,68,0.1)}
.dcu-about-project-link{color:inherit;text-decoration:none}
.dcu-about-project-link:hover{text-decoration:underline;text-underline-offset:3px}
.dcu-about-name-row{display:flex;align-items:center;gap:10px;min-width:0}
.dcu-about-name-row .dcu-about-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-about-downloads{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:20px;font-weight:400;text-decoration:none;white-space:nowrap}
.dcu-about-downloads svg{flex:none;opacity:.75}
`;
/** 宿主图标库不提供 GitHub 品牌标识，内联后可离线使用并继承当前文字颜色。 */
function GithubMark16() {
    return _jsx("svg", { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true", focusable: "false", children: _jsx("path", { fill: "currentColor", d: "M8 0a8 8 0 0 0-2.53 15.59c.4.074.547-.173.547-.385 0-.19-.007-.693-.01-1.36-2.226.484-2.695-1.073-2.695-1.073-.364-.924-.89-1.17-.89-1.17-.726-.496.055-.486.055-.486.803.056 1.225.824 1.225.824.714 1.223 1.872.87 2.328.665.072-.517.28-.87.508-1.07-1.777-.202-3.645-.888-3.645-3.956 0-.874.31-1.588.823-2.148-.083-.202-.357-1.017.078-2.12 0 0 .672-.215 2.2.82A7.65 7.65 0 0 1 8 4.8c.68.003 1.365.092 2.004.27 1.527-1.035 2.197-.82 2.197-.82.437 1.103.162 1.918.08 2.12.513.56.822 1.274.822 2.148 0 3.076-1.872 3.752-3.654 3.95.288.248.544.735.544 1.482 0 1.07-.01 1.932-.01 2.195 0 .214.144.463.55.384A8.001 8.001 0 0 0 8 0Z" }) });
}
function isDependencyStatus(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const status = value;
    return MANAGED_DEPENDENCIES.some(dependency => dependency.id === status.id)
        && typeof status.packageName === 'string' && typeof status.installed === 'boolean' && typeof status.updateAvailable === 'boolean';
}
export function isInstallProgress(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const progress = value;
    const phase = progress.phase;
    const total = progress.total;
    const percent = progress.percent;
    const currentPackage = progress.currentPackage;
    return typeof progress.active === 'boolean'
        && typeof progress.target === 'string'
        && typeof progress.seconds === 'number' && Number.isInteger(progress.seconds) && progress.seconds >= 0
        && typeof progress.lastLine === 'string'
        && (phase === null || (typeof phase === 'string' && PROGRESS_PHASES.has(phase)))
        && typeof progress.done === 'number' && Number.isInteger(progress.done) && progress.done >= 0
        && (total === null || (typeof total === 'number' && Number.isInteger(total) && total >= 0))
        && (percent === null || (typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100))
        && (currentPackage === null || typeof currentPackage === 'string');
}
function progressLabel(progress, t) {
    if (progress.phase !== null) {
        const current = progress.currentPackage === null || progress.currentPackage === '' ? '' : ` · ${progress.currentPackage}`;
        const done = progress.done > 0 ? ` · ${t('about.packagesDone').replace('{0}', String(progress.done))}` : '';
        return `${t(`about.progress.${progress.phase}`)}${current}${done}`;
    }
    if (progress.lastLine !== '')
        return `${progress.lastLine}  (${progress.seconds}s)`;
    return t('about.progressHint');
}
/** Codex UI 的功能说明、配套管理插件状态与受限安装入口。 */
export function AboutSection(props) {
    const { t } = props;
    const ctx = getClientContext();
    const [dependencies, setDependencies] = useState([]);
    const [state, setState] = useState('loading');
    const [installing, setInstalling] = useState();
    const [progress, setProgress] = useState();
    const [message, setMessage] = useState();
    const [refreshFailed, setRefreshFailed] = useState(false);
    const [loadFailure, setLoadFailure] = useState();
    const alive = useRef(true);
    const root = useRef(null);
    const stateRef = useRef('loading');
    const requestId = useRef(0);
    const installingRef = useRef();
    stateRef.current = state;
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const load = useCallback(async (signal) => {
        const currentRequest = ++requestId.current;
        if (stateRef.current !== 'ready')
            setState('loading');
        try {
            const response = await fetch(endpoint, { cache: 'no-store', signal });
            if (!response.ok)
                throw new BusinessRequestError(response.status);
            const payload = await response.json();
            if (signal?.aborted || currentRequest !== requestId.current)
                return;
            if (!Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus))
                throw new Error();
            setDependencies(payload.dependencies);
            setState('ready');
            setRefreshFailed(false);
            setLoadFailure(undefined);
        }
        catch (error) {
            if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError') || currentRequest !== requestId.current)
                return;
            setLoadFailure(error);
            if (stateRef.current === 'ready')
                setRefreshFailed(true);
            else
                setState('failed');
        }
    }, []);
    useEffect(() => {
        const node = root.current;
        const controller = new AbortController();
        const refresh = () => { void load(controller.signal); };
        refresh();
        if (node === null || typeof IntersectionObserver === 'undefined') {
            return () => { controller.abort(); };
        }
        let initialized = false;
        let wasVisible = false;
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.some((entry) => entry.isIntersecting);
            if (!initialized) {
                initialized = true;
                wasVisible = visible;
                return;
            }
            if (visible && !wasVisible)
                refresh();
            wasVisible = visible;
        }, { threshold: 0.2 });
        observer.observe(node);
        return () => {
            controller.abort();
            observer.disconnect();
        };
    }, [load]);
    useEffect(() => {
        if (installing === undefined) {
            setProgress(undefined);
            return;
        }
        let cancelled = false;
        const pull = async () => {
            try {
                const response = await fetch(`${endpoint}?action=progress`, { cache: 'no-store' });
                const payload = await response.json();
                if (cancelled || !response.ok || !isInstallProgress(payload.progress))
                    return;
                setProgress(payload.progress);
            }
            catch {
                // 轮询失败时忽略异常
            }
        };
        void pull();
        const timer = window.setInterval(() => { void pull(); }, 800);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [installing]);
    useEffect(() => {
        try {
            const remote = ctx?.remote;
            if (typeof remote?.$on !== 'function')
                return;
            const unsubs = [];
            try {
                unsubs.push(remote.$on('plugin-manager/install-state', (data) => {
                    if (data?.phase && typeof data.phase === 'string') {
                        setProgress(prev => prev ? { ...prev, phase: data.phase } : undefined);
                    }
                }));
            }
            catch {
                // ignore
            }
            try {
                unsubs.push(remote.$on('plugin-manager/changed', () => {
                    void load();
                }));
            }
            catch {
                // ignore
            }
            return () => {
                unsubs.forEach(unsub => { try {
                    unsub?.();
                }
                catch { } });
            };
        }
        catch {
            // ignore
        }
    }, [ctx, load]);
    const install = async (id) => {
        if (installingRef.current !== undefined)
            return;
        const dependency = dependencies.find(dep => dep.id === id);
        if (dependency === undefined)
            return;
        installingRef.current = id;
        setInstalling(id);
        setMessage(undefined);
        try {
            const response = await fetch(`${endpoint}?dependency=${encodeURIComponent(id)}`, { method: 'POST' });
            let payload = {};
            try {
                payload = await response.json();
            }
            catch {
                // ignore
            }
            if ([401, 403].includes(response.status))
                throw new BusinessRequestError(response.status);
            if (Array.isArray(payload.dependencies) && payload.dependencies.every(isDependencyStatus) && alive.current) {
                setDependencies(payload.dependencies);
            }
            if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus) || (payload.application !== 'applied' && payload.application !== 'restart-required' && payload.application !== 'overridden')) {
                throw new Error(typeof payload.error === 'string' ? payload.error : t('about.installFailed'));
            }
            if (!alive.current)
                return;
            setState('ready');
            setRefreshFailed(false);
            setMessage({ error: false, text: payload.application === 'overridden' ? t('about.applied') : (payload.application === 'applied' ? t('about.applied') : t('about.restartRequired')) });
        }
        catch (error) {
            if (!alive.current)
                return;
            setMessage({ error: true, text: installErrorText(error, t) });
        }
        finally {
            installingRef.current = undefined;
            if (alive.current)
                setInstalling(undefined);
        }
    };
    const updateAll = async () => {
        if (installingRef.current !== undefined)
            return;
        installingRef.current = 'all';
        setInstalling('all');
        setMessage(undefined);
        try {
            const response = await fetch(`${endpoint}?action=update-all`, { method: 'POST' });
            let payload = {};
            try {
                payload = await response.json();
            }
            catch {
                // ignore
            }
            if ([401, 403].includes(response.status))
                throw new BusinessRequestError(response.status);
            if (Array.isArray(payload.dependencies) && payload.dependencies.every(isDependencyStatus) && alive.current) {
                setDependencies(payload.dependencies);
            }
            if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus) || (payload.application !== 'applied' && payload.application !== 'restart-required' && payload.application !== 'overridden')) {
                throw new Error(typeof payload.error === 'string' ? payload.error : t('about.installFailed'));
            }
            if (!alive.current)
                return;
            setState('ready');
            setRefreshFailed(false);
            setMessage({ error: false, text: (payload.application === 'applied' || payload.application === 'overridden') && payload.updatedCount === 0 && Array.isArray(payload.results) && payload.results.length === 0
                    ? t('about.upToDate')
                    : (payload.application === 'overridden' ? t('about.applied') : (payload.application === 'applied' ? t('about.applied') : t('about.restartRequired'))) });
        }
        catch (error) {
            if (!alive.current)
                return;
            setMessage({ error: true, text: installErrorText(error, t) });
        }
        finally {
            installingRef.current = undefined;
            if (alive.current)
                setInstalling(undefined);
        }
    };
    const actionableCount = dependencies.filter(dependency => !dependency.installed || dependency.updateAvailable).length;
    const title = (id) => t(`about.dependency.${id}`);
    return _jsxs("section", { ref: root, className: "dcu-about", "aria-label": t('about.nav'), children: [_jsx("style", { children: stylesheet }), _jsxs("div", { className: "dcu-section-card dcu-card-features", children: [_jsxs("div", { className: "dcu-about-head", children: [_jsxs("div", { className: "dcu-about-title-row", children: [_jsx("h2", { className: "dcu-about-title", children: t('about.title') }), _jsxs("div", { className: "dcu-about-feedback-links dcu-about-links", children: [_jsx(PrimitiveButton, { variant: "outline", size: "sm", icon: _jsx(GithubMark16, {}), "aria-label": t('about.viewProject'), onClick: () => { openExternal(PROJECT_URL); }, children: t('about.viewProject') }), _jsx(PrimitiveButton, { variant: "outline", size: "sm", icon: _jsx(IconListPenOutlineMedium, { size: 14 }), "aria-label": t('about.feedback'), onClick: () => { openExternal(`${PROJECT_URL}/issues`); }, children: t('about.feedback') })] })] }), _jsx("p", { className: "dcu-about-desc", children: t('about.description') })] }), _jsx("div", { className: "dcu-section-subtitle-wrap", children: _jsx("span", { className: "dcu-section-subtitle", children: t('about.features') }) }), _jsx("div", { className: "dcu-subplugins-list", children: SUB_PLUGINS.map(item => (_jsxs("div", { className: "dcu-subplugin-item", children: [_jsxs("div", { className: "dcu-subplugin-header", children: [_jsx("span", { className: "dcu-subplugin-name", children: t(item.nameKey) }), _jsx("code", { className: "dcu-subplugin-badge", children: item.id })] }), _jsx("p", { className: "dcu-subplugin-desc", children: t(item.descKey) })] }, item.id))) })] }), _jsx(ThemeSettingsCard, { t: t }), _jsx(ComposerSettingsCard, { t: t }), _jsxs("div", { className: "dcu-section-card dcu-card-dependencies", children: [_jsxs("div", { className: "dcu-section-header", children: [_jsxs("div", { className: "dcu-section-title-wrap", children: [_jsx("h3", { className: "dcu-section-title", children: t('about.dependencies') }), _jsx("p", { className: "dcu-section-desc", children: t('about.dependenciesDescription') })] }), state === 'ready' && actionableCount > 0 && _jsx(PrimitiveButton, { variant: "outline", size: "sm", icon: installing === 'all' ? _jsx(IconLoadingOutlineMedium, { size: 14 }) : _jsx(IconDownloadOutlineMedium, { size: 14 }), "aria-busy": installing === 'all', disabled: installing !== undefined, onClick: () => { void updateAll(); }, children: installing === 'all' ? t('about.updatingAll') : t('about.updateAll') })] }), state === 'loading' ? _jsx("div", { className: "dcu-about-message", role: "status", children: t('about.loading') })
                        : state === 'failed' ? _jsx("div", { className: "dcu-about-message", "data-error": "true", role: "alert", children: t(businessRequestErrorKey(loadFailure) ?? 'about.statusFailed') })
                            : _jsx("div", { className: "dcu-about-dependencies", "aria-busy": installing !== undefined, children: dependencies.map(dependency => _jsxs("article", { className: "dcu-about-dependency", "data-dependency-id": dependency.id, children: [_jsxs("div", { className: "dcu-about-copy", children: [_jsxs("div", { className: "dcu-about-name-row", children: [_jsx("a", { className: "dcu-about-name dcu-about-project-link", href: PROJECT_HOMEPAGES[dependency.id], target: "_blank", rel: "noreferrer", children: title(dependency.id) }), _jsxs("a", { className: "dcu-about-downloads", href: `https://www.npmjs.com/package/${dependency.packageName}`, target: "_blank", rel: "noreferrer", title: t('about.downloadsSource'), "aria-label": `${dependency.packageName} · ${t('about.totalDownloads')} · ${typeof dependency.totalDownloads === 'number' && Number.isSafeInteger(dependency.totalDownloads) && dependency.totalDownloads >= 0 ? dependency.totalDownloads.toLocaleString() : t('about.downloadsUnavailable')}`, children: [_jsx(IconDownloadOutlineMedium, { size: 12, "aria-hidden": "true" }), _jsx("span", { className: "dcu-about-downloads-count", children: typeof dependency.totalDownloads === 'number' && Number.isSafeInteger(dependency.totalDownloads) && dependency.totalDownloads >= 0 ? dependency.totalDownloads.toLocaleString() : '—' })] })] }), _jsxs("div", { className: "dcu-about-package", title: dependency.packageName, children: [_jsx("a", { className: "dcu-about-project-link", href: PROJECT_HOMEPAGES[dependency.id], target: "_blank", rel: "noreferrer", children: dependency.packageName }), dependency.version === undefined ? '' : ` · ${dependency.version}`, dependency.updateAvailable && dependency.latestVersion !== undefined ? ` → ${dependency.latestVersion}` : ''] })] }), _jsxs("div", { className: "dcu-about-actions", children: [_jsxs("div", { className: "dcu-about-status", "data-installed": dependency.installed, "data-update": dependency.updateAvailable, children: [dependency.installed && !dependency.updateAvailable && _jsx(IconCheckOutlineMedium, { size: 14 }), dependency.updateAvailable ? t('about.updateAvailable') : dependency.installed ? t('about.installed') : t('about.missing')] }), (!dependency.installed || dependency.updateAvailable) && _jsx(PrimitiveButton, { variant: "outline", size: "sm", icon: installing === dependency.id ? _jsx(IconLoadingOutlineMedium, { size: 14 }) : (!dependency.installed ? _jsx(IconDownloadOutlineMedium, { size: 14 }) : _jsx(IconRefreshOutlineMedium, { size: 14 })), disabled: installing !== undefined, "aria-busy": installing === dependency.id, onClick: () => { void install(dependency.id); }, children: installing === dependency.id ? t('about.installing') : dependency.updateAvailable ? t('about.update') : t('about.install') })] })] }, dependency.id)) }), installing !== undefined && _jsxs("div", { className: "dcu-about-progress", role: "status", children: [_jsx("span", { children: _jsx(IconLoadingOutlineMedium, { size: 14 }) }), _jsx("code", { children: progress === undefined ? t('about.progressHint') : progressLabel(progress, t) }), progress?.percent !== null && progress?.percent !== undefined && _jsxs("span", { className: "dcu-about-progress-pct", children: [progress.percent, "%"] }), _jsx("div", { className: "dcu-about-progress-bar", children: _jsx("div", { className: "dcu-about-progress-fill", "data-wave": progress?.percent === null || progress?.percent === undefined, style: progress?.percent === null || progress?.percent === undefined ? undefined : { width: `${progress.percent}%` } }) })] }), refreshFailed && state === 'ready' && _jsx("div", { className: "dcu-about-message", "data-error": "true", role: "status", children: t(businessRequestErrorKey(loadFailure) ?? 'about.refreshFailed') }), message !== undefined && _jsx("div", { className: "dcu-about-message", "data-error": message.error, role: message.error ? 'alert' : 'status', children: message.text })] })] });
}
//# sourceMappingURL=AboutSection.js.map