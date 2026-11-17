const MOBILE_WEB_QUERY = '(max-width: 767px), (max-width: 1023px) and (pointer: coarse), (max-width: 1023px) and (hover: none)';
const NATIVE_CHROME = '[data-windows-titlebar], [data-platform="darwin"]';
const MOBILE_ATTR = 'data-wui-mobile-web';
const SHORT_VIEWPORT_ATTR = 'data-wui-short-viewport';
const MENU_ATTR = 'data-wui-viewport-menu';
// Popovers, context menus, and slash-command trigger dropdowns.
// Matches anchor-side / context-menu popovers even during phase transitions where host omits role="menu".
// data-gitgraph-popover reserves viewport fitting for GitGraph popovers.
const POPUPS = '[data-trigger-menu], :is([data-anchor-side], [data-context-menu]), [data-gitgraph-popover]';
const POPUP_MARGIN = 8;
const MOBILE_WEB_CSS = `
html[data-wui-mobile-web] :is([class*="_frame"], :has(> [data-shell-bottom])):has(> [data-shell-overlay]) {
  height: var(--wui-frame-height, 100dvh);
  top: var(--wui-frame-top, 0px);
  box-sizing: border-box;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
html[data-wui-mobile-web] [data-sidebar-drawer] [data-shell-leading] {
  top: max(0px, calc(env(safe-area-inset-top) - 2px));
  left: max(4px, env(safe-area-inset-left));
}
html[data-wui-mobile-web] [data-sidebar-drawer] [data-sidebar-mask] + div {
  box-sizing: border-box;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom) env(safe-area-inset-left);
}
html[data-wui-mobile-web] :is([data-sidebar-opener], [data-sidebar-toggle], [class*="_sidebarCol"] button[class*="_toggle"], [class*="_leadingSeat"] button) {
  min-width: 44px;
  min-height: 44px;
}

html[data-wui-mobile-web] :is([data-sidebar-scrollport], [class*="_sidebarCol"]) :is(.wui-sb-row, [data-row-key^="session:"], [data-row-key^="workspace:"], [class*="_searchResultRow"]) {
  min-height: 44px;
  max-height: none;
}
html[data-wui-mobile-web] :is([data-sidebar-scrollport], [class*="_sidebarCol"]) :is([data-row-key^="session:"], [data-row-key^="workspace:"], [class*="_searchResultRow"]) [class*="_rowActions"] {
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: auto;
}
html[data-wui-mobile-web] :is([data-sidebar-scrollport], [class*="_sidebarCol"]) [data-row-key^="session:"] [class*="_timestamp"] {
  display: none;
}
html[data-wui-mobile-web] :is([data-sidebar-scrollport], [class*="_sidebarCol"]) [class*="_rowActions"] button,
html[data-wui-mobile-web] :is([data-sidebar-workspace-header], [class*="_sectionHeader"]) [class*="_clearButton"] {
  box-sizing: border-box;
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}
html[data-wui-mobile-web] :is([data-sidebar-workspace-header], [class*="_sectionHeader"]):has(input[class*="_searchInput"]),
html[data-wui-mobile-web] :is([data-sidebar-workspace-header], [class*="_sectionHeader"]) [class*="_searchExpanded"] {
  min-height: 44px;
}
html[data-wui-mobile-web] :is([data-sidebar-scrollport], [class*="_sidebarCol"]) :is([class*="_searchInput"], [class*="_renameInput"]),
html[data-wui-mobile-web] [data-composer-input],
html[data-wui-mobile-web] [data-shortcut-modal="settings"] :is(input, select, textarea) {
  font-size: max(16px, 1em) !important;
}
html[data-wui-mobile-web] [data-composer-card] :is(button, [role="button"]),
html[data-wui-mobile-web] [class*="_heroWorkspaceRow"] button {
  min-height: 36px;
}
/* The hero normally reserves space for its introduction and suggestions. The
   visible viewport must be allowed to shrink that region before the composer. */
html[data-wui-mobile-web][data-wui-short-viewport] [data-phase="hero"] [data-composer-seat] {
  flex: 1 1 auto;
}
html[data-wui-mobile-web][data-wui-short-viewport] [data-phase="hero"] [class*="_composerHero"] {
  min-height: 0;
  padding-bottom: 8px;
}
html[data-wui-mobile-web][data-wui-short-viewport] [data-phase="hero"] [class*="_composerHero"] > :first-child {
  min-height: 0;
  padding-block: 0;
  overflow: auto;
}
html[data-wui-mobile-web][data-wui-short-viewport] [data-composer-card] [data-input-scroll] {
  max-height: min(336px, max(52px, calc(var(--wui-frame-height) - 180px - env(safe-area-inset-top) - env(safe-area-inset-bottom))));
}
html[data-wui-mobile-web] [data-trigger-menu] [role="option"],
html[data-wui-mobile-web] [data-wui-viewport-menu] :is([role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]) {
  min-height: 44px;
}
html[data-wui-mobile-web] [data-wui-viewport-menu] {
  box-sizing: border-box;
  max-width: var(--wui-menu-width) !important;
  min-width: min(var(--wui-menu-width), var(--wui-menu-min-width, 0px)) !important;
  max-height: var(--wui-menu-height) !important;
  min-height: 0 !important;
  translate: var(--wui-menu-x, 0px) var(--wui-menu-y, 0px);
  overscroll-behavior: contain;
}
html[data-wui-mobile-web] [data-gitgraph-popover][data-wui-viewport-menu] {
  overflow: auto;
}
`;
function boundsOf(win, viewport) {
    return {
        left: viewport?.offsetLeft ?? 0,
        top: viewport?.offsetTop ?? 0,
        width: viewport?.width ?? win.innerWidth,
        height: viewport?.height ?? win.innerHeight,
    };
}
function setPixels(style, property, value) {
    const pixels = `${value}px`;
    if (style.getPropertyValue(property) !== pixels)
        style.setProperty(property, pixels);
}
const MENU_PROPERTIES = ['--wui-menu-width', '--wui-menu-min-width', '--wui-menu-height', '--wui-menu-x', '--wui-menu-y'];
const VIEWPORT_PROPERTIES = ['--wui-viewport-left', '--wui-viewport-top', '--wui-viewport-width', '--wui-viewport-height', '--wui-frame-top', '--wui-frame-height'];
function fitPopup(popup, bounds, win) {
    const style = popup.style;
    if (!popup.hasAttribute(MENU_ATTR)) {
        const minWidth = Number.parseFloat(win.getComputedStyle(popup).minWidth);
        if (Number.isFinite(minWidth))
            setPixels(style, '--wui-menu-min-width', minWidth);
        popup.setAttribute(MENU_ATTR, '');
    }
    const width = Math.max(0, bounds.width - POPUP_MARGIN * 2);
    const height = Math.max(0, bounds.height - POPUP_MARGIN * 2);
    const left = bounds.left + POPUP_MARGIN;
    const top = bounds.top + POPUP_MARGIN;
    const previousX = Number.parseFloat(style.getPropertyValue('--wui-menu-x')) || 0;
    const previousY = Number.parseFloat(style.getPropertyValue('--wui-menu-y')) || 0;
    setPixels(style, '--wui-menu-width', width);
    setPixels(style, '--wui-menu-height', height);
    if (popup.hasAttribute('data-trigger-menu')) {
        // The host menu is anchored above the composer. Its inline cap also reserves
        // space for the conversation header, which is measured from the frame top.
        const nativeCap = Number.parseFloat(style.maxHeight);
        const bottom = popup.getBoundingClientRect().bottom - previousY;
        const above = Math.max(0, bottom - top);
        setPixels(style, '--wui-menu-height', Math.min(height, above, Number.isFinite(nativeCap) ? nativeCap : height));
    }
    const rect = popup.getBoundingClientRect();
    const naturalLeft = rect.left - previousX;
    const naturalTop = rect.top - previousY;
    const x = Math.max(left, Math.min(naturalLeft, left + width - rect.width));
    const y = Math.max(top, Math.min(naturalTop, top + height - rect.height));
    setPixels(style, '--wui-menu-x', x - naturalLeft);
    setPixels(style, '--wui-menu-y', y - naturalTop);
}
function resetPopup(popup) {
    popup.removeAttribute(MENU_ATTR);
    MENU_PROPERTIES.forEach(property => popup.style.removeProperty(property));
}
/** Keep the host frame above the keyboard while retaining its width during pinch zoom. */
export function observeMobileWeb(win = typeof window === 'undefined' ? undefined : window) {
    if (win?.document.body == null || typeof win.matchMedia !== 'function')
        return () => { };
    const doc = win.document;
    const root = doc.documentElement;
    const viewport = win.visualViewport;
    const mobile = win.matchMedia(MOBILE_WEB_QUERY);
    const sheet = doc.createElement('style');
    sheet.textContent = MOBILE_WEB_CSS;
    doc.head.append(sheet);
    let active = false;
    let frame;
    let popups = new Set();
    const update = () => {
        frame = undefined;
        if (!active)
            return;
        const bounds = boundsOf(win, viewport);
        const unzoomed = Math.abs((viewport?.scale ?? 1) - 1) < 0.01;
        // Some browsers resize only the visual viewport for the keyboard. Others
        // resize both viewports, where the available height alone signals the squeeze.
        root.toggleAttribute(SHORT_VIEWPORT_ATTR, unzoomed && (bounds.height < 600 || bounds.height < win.innerHeight - 100));
        const values = [bounds.left, bounds.top, bounds.width, bounds.height,
            unzoomed ? bounds.top : 0, unzoomed ? bounds.height : win.innerHeight];
        VIEWPORT_PROPERTIES.forEach((property, index) => setPixels(root.style, property, values[index]));
        const visible = new Set(doc.querySelectorAll(POPUPS));
        for (const popup of popups)
            if (!visible.has(popup))
                resetPopup(popup);
        for (const popup of visible)
            fitPopup(popup, bounds, win);
        popups = visible;
    };
    const schedule = () => {
        if (frame === undefined && active)
            frame = win.requestAnimationFrame(update);
    };
    const observer = new win.MutationObserver(records => {
        if (records.some(record => {
            const target = record.target;
            if (target instanceof win.Element && target.closest(POPUPS))
                return true;
            return [...record.addedNodes, ...record.removedNodes].some(node => node instanceof win.Element && (node.matches(POPUPS) || node.querySelector(POPUPS) !== null));
        }))
            schedule();
    });
    const clear = () => {
        if (frame !== undefined)
            win.cancelAnimationFrame(frame);
        frame = undefined;
        root.removeAttribute(MOBILE_ATTR);
        root.removeAttribute(SHORT_VIEWPORT_ATTR);
        VIEWPORT_PROPERTIES.forEach(property => root.style.removeProperty(property));
        for (const popup of popups)
            resetPopup(popup);
        popups.clear();
    };
    const sync = () => {
        const next = mobile.matches && !root.matches(NATIVE_CHROME);
        if (next === active)
            return;
        active = next;
        if (active) {
            root.setAttribute(MOBILE_ATTR, '');
            observer.observe(doc.body, { childList: true, subtree: true });
            update();
        }
        else {
            observer.disconnect();
            clear();
        }
    };
    const chrome = new win.MutationObserver(sync);
    chrome.observe(root, { attributes: true, attributeFilter: ['data-platform', 'data-windows-titlebar'] });
    sync();
    mobile.addEventListener('change', sync);
    win.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    return () => {
        active = false;
        mobile.removeEventListener('change', sync);
        win.removeEventListener('resize', schedule);
        viewport?.removeEventListener('resize', schedule);
        viewport?.removeEventListener('scroll', schedule);
        observer.disconnect();
        chrome.disconnect();
        clear();
        sheet.remove();
    };
}
//# sourceMappingURL=mobile-web.js.map