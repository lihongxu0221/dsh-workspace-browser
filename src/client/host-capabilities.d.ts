/**
 * Host capabilities this plugin can use but must not require.
 *
 * The extra-source-folder feature (`addFolder` / `removeFolder` /
 * `setPrimaryFolder`, plus the `folders` projection on a Workspace view) landed
 * on the workspace controller after the 0.2.0-rc.2 client shipped: the deployed
 * desktop build's `IWorkspaces` has none of them, while the newer host this
 * plugin is developed against has all three.
 *
 * Declaring them optional keeps the plugin compiling against either host. The
 * apply probes for them at runtime. When they are missing, the plugin keeps
 * the folder list and the promoted primary itself, and new Sessions for a
 * promoted folder are created with that cwd.
 */
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'

declare module '@deepseek-ai/dsh-api-workspace-controller/client' {
  interface IWorkspaces {
    /** Add an extra source folder to an existing Workspace. */
    addFolder?(workspaceId: WorkspaceId, path: string): Promise<WorkspaceView>
    /** Remove an extra source folder from a Workspace; the directory is kept. */
    removeFolder?(workspaceId: WorkspaceId, path: string): Promise<WorkspaceView>
    /** Make an owned extra folder the Workspace's primary directory (new-session cwd). */
    setPrimaryFolder?(workspaceId: WorkspaceId, path: string): Promise<WorkspaceView>
  }
}
