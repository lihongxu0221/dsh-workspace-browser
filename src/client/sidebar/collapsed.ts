/**
 * Sidebar collapse detection.
 *
 * The host has used both a `collapsed` class token and a
 * `data-sidebar-collapsed` attribute across releases. The enhanced sidebar
 * must follow whichever signal is present so it never renders on top of the
 * host's native 56px rail, and the stylesheet can use one stable marker of our
 * own.
 */

export interface SidebarCollapseSignals {
  /** Class list of the sidebar root, if a root is available. */
  className?: string | null
  /** Value of `data-sidebar-collapsed` on the root itself. */
  collapsedAttr?: string | null
  /** Whether an ancestor carries `data-sidebar-collapsed="true"`. */
  ancestorCollapsed?: boolean
}

/** True when any supported collapse signal is active. */
export function isSidebarCollapsed(signals: SidebarCollapseSignals): boolean {
  if (signals.collapsedAttr === 'true' || signals.ancestorCollapsed === true) return true
  const className = signals.className ?? ''
  return className.split(/\s+/).some(token => token.toLowerCase().includes('collapsed'))
}

/** Read the collapse state from a live sidebar root. */
export function readSidebarCollapse(root: HTMLElement): boolean {
  return isSidebarCollapsed({
    className: typeof root.className === 'string' ? root.className : '',
    collapsedAttr: root.getAttribute('data-sidebar-collapsed'),
    ancestorCollapsed: root.closest('[data-sidebar-collapsed="true"]') !== null,
  })
}
