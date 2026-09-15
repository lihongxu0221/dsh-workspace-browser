# dsh-workspace-browser

Standalone extraction of the DeepSeek Harness workspace plugin — the sidebar **Workspace / session tree** (`WorkspaceBrowser`), **Recents**, extra-folder **project editor**, and the conversation-hero **WorkspacePicker** — as an independent Cordis client plugin.

This extraction is based on the **winexeNew** branch of deepseek-harness (`packages/client/ui-workspace`). The harness repository is not modified.

## Required: winexeNew data layer

Fold/pin/Recents, the project editor, and primary/extra-folder handles depend on Workspace Controller APIs that exist on **winexeNew** (not a stock `master` without those changes):

- `workspace/workspace` — `WorkspaceView.folders`, primary folder, extra folders (`src/folders.ts`).
- `api/workspace-controller` — `addFolder` / `removeFolder` / `setPrimaryFolder`.
- Client split packages — `dsh-api-session-controller`, `dsh-api-workspace-controller`, `dsh-client-store`, `dsh-util-workspace-path` (there is no `dsh-client-runtime` on this branch).

To run this plugin the harness must be winexeNew (or otherwise include those packages); otherwise `ctx.workspaces.addFolder(...)` and friends do not exist and the plugin will not typecheck or run.

## Layout

```
src/
  index.ts                 node half (empty apply — host lifecycle placeholder)
  client/
    index.ts               apply: provideRoot + sidebar.workspaces + conversation.hero.workspace
    contract/slots.ts      DirectoryFlowOwnerProps + browser/picker prop/inject shares
    navigation.ts          ctx.uiWorkspace (open / start / fork / archive)
    rows/WorkspaceBrowser.tsx
    WorkspacePicker.tsx    add-workspace menu + directory-flow error dialog + hero wrapper
    WorkspaceEditDialog.tsx
    tree.ts / stores.ts / subagent-lineage.ts / locales.ts
    *.module.css
```

## Registration

The plugin declares two slot entries and two `single` child holes:

- `sidebar.workspaces` → `WorkspaceBrowser` (owned by `ui-sidebar`)
- `sidebar.workspaces.directoryFlow` → filled by a directory-picker occupant (`-native` / `-browse`)
- `conversation.hero.workspace` → `WorkspacePicker` (owned by `ui-conversation`)
- `conversation.hero.workspace.directoryFlow` → the same occupant family

It also binds the global `useWorkspaces` hook (`slots.provideRoot`) and publishes `ctx.uiWorkspace`.

The owner contract `DirectoryFlowOwnerProps` is exported from this package so a composed directory-picker can type its occupant.

## Mutual exclusion

Because `sidebar.workspaces`, `conversation.hero.workspace`, the `workspace` locale namespace, and `ctx.uiWorkspace` are the same identities as in-tree `@deepseek-ai/dsh-client-ui-workspace`, load **one or the other**, not both.

## Dependencies (peer)

`@deepseek-ai/cordis`, `dsh-api-remotes`, `dsh-api-session-controller`, `dsh-api-workspace-controller`, `dsh-client-connection`, `dsh-client-locale`, `dsh-client-store`, `dsh-client-ui-conversation`, `dsh-client-ui-layout`, `dsh-client-ui-primitives`, `dsh-client-ui-renderer`, `dsh-client-ui-session`, `dsh-client-ui-sidebar`, `dsh-client-ui-slots`, `dsh-schedule`, `dsh-session`, and `dsh-util-workspace-path`. These are deepseek-harness workspace packages on winexeNew.

## Local development against deepseek-harness

The harness packages are not yet published to npm and their internal edges use the `workspace:` protocol, so `npm install` cannot resolve them from registry. Two paths:

1. **Typecheck**: `tsconfig.json` extends `../../deepseek-harness/tsconfig.base.client.json` and maps `@deepseek-ai/*` to winexeNew `lib/types` (checkout `D:\GitLocal\deepseek-harness`). From the harness:

   ```
   .\node_modules\.bin\tsc.cmd -p ..\DSH\dsh-workspace-browser\tsconfig.json
   ```

2. **Package linking**: once the harness packages publish, switch `peerDependencies` to the npm registry and `pnpm install`. Until then, add this package to a harness `cordis.yml` profile (or use `pnpm link`) to load it **in place of** `ui-workspace`.

## Running in DSH Web GUI

This package includes the patch file `cordis.patch.yml` and pre-built `lib/` artifacts.

### Method 1: Start with `--patch` overlay (Quickest)

From `D:\GitLocal\deepseek-harness`:

```powershell
pnpm dsh web --patch D:\GitLocal\DSH\dsh-workspace-browser\cordis.patch.yml
```

Open or hard-refresh `http://127.0.0.1:8080` in your browser.

To verify config layer resolution:

```powershell
pnpm dsh web --patch D:\GitLocal\DSH\dsh-workspace-browser\cordis.patch.yml --dump-config
```

You should see `ui-workspace` with `disabled: true` and `ui-workspace-browser` inserted.

### Method 2: Install into the profile permanently

```powershell
pnpm dsh plugin --profile web add D:\GitLocal\DSH\dsh-workspace-browser
```

## Known gaps

- No package tests (in-tree coverage stays in `packages/client/ui-workspace/tests`).
- Typecheck reads harness `lib/types` plus `src/client/harness-lib-shims.d.ts` for `IWorkspaces.unarchiveSession` (present in winexeNew source, missing from the last emit).
- Future in-tree `ui-workspace` changes are not synced automatically.
