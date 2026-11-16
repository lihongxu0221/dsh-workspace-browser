/**
 * The client context shared with slot components that need remote events.
 *
 * Slot entries do not receive the Cordis context, so the apply function stores
 * it here once. Components read it lazily and tolerate the tiny window before
 * apply runs (for example during a hot reload).
 */
import type { Context } from '@deepseek-ai/cordis'

let current: Context | undefined

/** Record the context that owns the mounted client tree. */
export function setClientContext(ctx: Context): void {
  current = ctx
}

/** The current client context, if the plugin has been applied. */
export function getClientContext(): Context | undefined {
  return current
}