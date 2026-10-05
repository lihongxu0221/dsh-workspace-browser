# dsh-workspace-browser

Standalone Cordis client plugin that gives the shipped dsh web client the workspace features it does not have: the sidebar **Recents** section, collapsible section headers, the **project editor** with extra source folders, pin/rename/fork/archive row actions, search, shortcuts, and the conversation-hero **workspace picker**.

## Why it exists

The deployed client (**0.2.0-rc.2**, the 2026-09-29 Desktop build) ships a workspace browser with no Recents, no collapsible sections and no project editor. This plugin replaces that region with the feature-complete implementation from the harness's `winexeNew` branch.

`cordis.patch.yml` disables the in-tree `ui-workspace` row — both claim the same slots, locale namespace (`workspace`) and `ctx.uiWorkspace` service — and loads this plugin instead. A bundle whose slots never register therefore leaves the workspace region **empty**, which is why the client-half surface is checked against the host before any install (see Verification).

## Source folders on a host without the folder API

`addFolder` / `removeFolder` / `setPrimaryFolder` and the `folders` projection on a workspace view exist only on the newer workspace controller; the shipped host has none of them. The plugin owns the feature there:

- the folder list lives in the plugin's own persisted viewing store (`persist: 'dsh.workspace.view.v5'`);
- the browser merges those folders into the Workspace list it derives from (`mergePluginFolders` in [src/client/tree.ts](src/client/tree.ts)) and attributes Sessions to a Workspace by matching their `cwd` against the list — the host leaves such Sessions ungrouped, so only unclaimed ones are borrowed;
- *set as primary* remembers a folder and creates new Sessions with that cwd (`sessions.create({ workspaceId, cwd })` in [src/client/navigation.ts](src/client/navigation.ts)), keeping the user-visible meaning — new Sessions land there — while the host workspace path stays untouched.

Where the host *does* expose the folder API ([src/client/host-capabilities.d.ts](src/client/host-capabilities.d.ts) declares the three methods optional), the same editor actions route to it instead.

The tag `appgen-0.3.0` keeps an earlier parity-only build (exactly the host's own feature set) for a host that lacks the newer client module table.

## Layout

```
src/index.ts                        node half — empty apply so the row exists in the host composition
src/client/index.ts                 apply: registrations, the ctx.uiWorkspace service, capability probe
src/client/host-capabilities.d.ts   the optional host folder APIs and why they are optional
src/client/contract/slots.ts        slot owner/occupant contracts
src/client/rows/…                   WorkspaceBrowser, SessionTree, Rows, AnimatedRows
src/client/session-actions/…        pin / rename / fork / archive rows, toast
src/client/WorkspaceEditDialog.tsx  project editor: title, source folders, primary folder
src/client/{tree,stores,pin-order,shortcuts,navigation,locales}.ts
cordis.patch.yml                    bundle patch: disable ui-workspace, insert this plugin
cordis.patch.dev.yml                the same swap with an absolute path, for `--patch` runs
scripts/build-client.mjs            emits lib/client.js through the harness client preset
```

## Install

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

The GUI plugin manager does the same. `cordis.patch.yml` is declared by `dsh.bundle.patch`, so it must stay in `files`: a packed package (git or npm install) that lacks it is rejected with `failed to read overlay`.

## Build

```powershell
pnpm install
pnpm run typecheck              # against the generation pinned in devDependencies
pnpm run build                  # tsc: src -> lib/types (the client preset consumes this)
node scripts/build-client.mjs   # harness client preset: lib/types -> lib/client.js + lib/index.js
```

`scripts/build-client.mjs` uses the client-bundle preset from a dsh source checkout (`packages/client/tsdown.client.ts`, default `..\..\deepseek-harness`, override with `$DSH_HARNESS` or an argument). The preset resolves a package through `packages/<group>/<dir>/package.json`, so the script stages a temporary face package inside the checkout, links this repo's `node_modules` into it, runs tsdown for the Client face, normalizes the checkout path out of the emitted banners, copies the artifacts back and deletes the staging directory. The checkout itself is left untouched.

## Verification

1. **Types.** `devDependencies` pins every `@deepseek-ai/*` package to the newer published generation (`0.2.1-alpha.1`), so `pnpm run typecheck` fails on any atom, prop or service that generation lacks. The three host folder APIs are intentionally absent from the published surface and are declared optional locally — that is what keeps the plugin compiling for both hosts.
2. **Bundle surface.** Diff the bundle against the host build: extract the host's own `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js` from `resources/app.asar`, then compare the `//#region lib/types/...` module lists and the member sets required from each module-table entry (`_deepseek_ai_dsh_client_ui_primitives.X`, `…dsh_client_store.X`, `_deepseek_ai_dsh_cordis.X`, `react.X`, `react_jsx_runtime.X`), and check every required primitives symbol against the host's single `export { … }` list. Extra modules (the project editor) and extra members are fine only when the host exports them.
3. **Runtime.** Boot the host's own runtime against a throwaway profile with this bundle installed, then load the served UI in a headless browser and assert that the added features render: the `最近会话` / `Recents` section (the in-tree plugin has no such key), a workspace row menu that offers *编辑项目*, a project editor dialog carrying *源文件夹* and *添加文件夹*, and a console with no errors.

## Known gaps

- **The plugin-level primary folder is not a host path change.** It decides the cwd of *new* Sessions; anything else that resolves the Workspace's directory still sees the host path, because the shipped host has no API to repoint it.
- **Folder membership is matched by Session `cwd`**, and only Sessions the host left ungrouped are borrowed. A Session that the host already groups under its own Workspace stays there.
- `src/` is vendored from `winexeNew` rather than hand-written: re-vendor it when moving to another host generation and keep the capability probes.
- No package tests; the in-tree suite stays in `packages/client/ui-workspace/tests` at the vendored revision.
