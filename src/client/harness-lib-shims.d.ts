/**
 * winexeNew `packages/api/workspace-controller/src/client/service.ts` already
 * has `unarchiveSession`; the last emitted `lib/types` does not. This merge
 * keeps `UiWorkspaceService` aligned with source while typechecking against
 * those declarations.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'

declare module '@deepseek-ai/dsh-api-workspace-controller/client' {
  interface IWorkspaces {
    /**
     * Unarchive a Session from the archived Session list.
     * @param sessionId - Session to unarchive.
     */
    unarchiveSession(sessionId: SessionId): Promise<void>
  }
}
