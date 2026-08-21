# dsh-workspace-browser

Standalone extraction of the DeepSeek Harness workspace browser — the sidebar's **Workspace / session tree** (`WorkspaceBrowser`) plus its **add-workspace flow** (`WorkspacePickFlow`) — as an independent Cordis client plugin. The source is lifted from `packages/client/ui-workspace` and reduced to a single slot registration; the original repository is not modified.

`WorkspaceBrowser` fills the `sidebar.workspaces` slot with the grouped/flat session tree, session search, Workspace add/rename/edit/reorder, extra-folder and primary-folder management, and the Workspace row menu.

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

The harness packages are not yet published to npm, and their internal edges use the `workspace:` protocol, so `npm install` cannot resolve them from registry. Two local paths:

1. **Typecheck** (no install): `tsconfig.json` extends `../deepseek-harness/tsconfig.base.json`, so `tsc -p tsconfig.json` resolves `@deepseek-ai/*` straight to the adjacent harness source. Run from this repo:

   ```
   pnpm exec tsc -p tsconfig.json
   ```

2. **Package linking**: once the harness packages are published, switch `peerDependencies` to the npm registry and `pnpm install`. Until then, add this package to a harness `cordis.yml` profile (or use `pnpm link`) to load it.

## Loading into a harness profile

Add the package name to the web profile's `dsh.client` rows (as the harness does for `ui-workspace`). Because the `sidebar.workspaces` slot is owned by `ui-sidebar`, the existing `ui-workspace` browser and this extraction both claim the same hole — load one or the other, not both.