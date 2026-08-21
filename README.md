# dsh-workspace-browser

Standalone extraction of the DeepSeek Harness workspace browser — the sidebar's **Workspace / session tree** (`WorkspaceBrowser`) plus its **add-workspace flow** (`WorkspacePickFlow`) — as an independent Cordis client plugin.

This extraction is based on the **winexeBuilder branch** of deepseek-harness, where the sidebar tree gained the fold/pin/Recents view, the Codex-style project editor, and primary/extra-folder management. The plugin source is lifted from `packages/client/ui-workspace` on that branch and reduced to a single `sidebar.workspaces` registration. The harness repository is not modified.

## Required: winexeBuilder data layer

The folded/pinned tree, edit dialog, and primary/extra-folder handles depend on data-layer additions that exist **only on the winexeBuilder branch** (not `master`):

- `workspace/workspace` — `WorkspaceView.folders`, primary folder, extra folders (`src/folders.ts`).
- `client/runtime` — `ctx.workspaces.addFolder` / `removeFolder` / `setPrimaryFolder`.
- `host/apiproxy` — the workspace API for folders / primary folder.

To run this plugin the harness must be the winexeBuilder branch (or otherwise include those changes); otherwise `ctx.workspaces.addFolder(...)` and friends do not exist and the plugin will not typecheck or run.

## Layout

```
src/
  index.ts                 node half (empty apply — host lifecycle placeholder)
  invariant.ts             invariant companion
  client/
    index.ts               apply: registers sidebar.workspaces
    contract/slots.ts      DirectoryFlowOwnerProps + browser prop/inject shares
    WorkspaceBrowser.tsx   the sidebar tree region
    WorkspacePickFlow.tsx  add-workspace menu + directory-flow error dialog
    WorkspaceEditDialog.tsx
    tree.ts / stores.ts / rows/ / locales.ts
    *.module.css
```

## Registration

The plugin declares one slot entry and one `single` child hole:

- `sidebar.workspaces` → `WorkspaceBrowser` (owned by `ui-sidebar`)
- `sidebar.workspaces.directoryFlow` → filled by a directory-picker occupant (`-native` / `-browse`)

The owner contract `DirectoryFlowOwnerProps` is exported from this package so a composed directory-picker can type its occupant.

## Dependencies (peer)

`@deepseek-ai/dsh-client-runtime`, `dsh-client-ui-slots`, `dsh-client-ui-sidebar`, `dsh-client-ui-primitives`, `dsh-client-connection`, `dsh-client-locale`, `dsh-invariants`, and `@deepseek-ai/cordis`. These are deepseek-harness workspace packages at `0.1.0-rc.8`.

## Local development against deepseek-harness

The harness packages are not yet published to npm and their internal edges use the `workspace:` protocol, so `npm install` cannot resolve them from registry. Two paths:

1. **Typecheck**: `tsconfig.json` extends `../deepseek-harness/tsconfig.base.json` (on the winexeBuilder branch) to resolve `@deepseek-ai/*` against the harness source graph. Run it from inside the harness:

   ```
   pnpm exec tsc -p ../dsh-workspace-browser/tsconfig.json
   ```

2. **Package linking**: once the harness packages publish, switch `peerDependencies` to the npm registry and `pnpm install`. Until then, add this package to a harness `cordis.yml` profile (or use `pnpm link`) to load it.

## Loading into a harness profile

Add the package name to the web profile's `dsh.client` rows (as the harness does for `ui-workspace`). Because `sidebar.workspaces` is owned by `ui-sidebar`, the existing `ui-workspace` browser and this extraction both claim the same hole — load one or the other, not both.