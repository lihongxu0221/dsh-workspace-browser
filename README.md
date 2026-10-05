# dsh-workspace-browser

Standalone extraction of the dsh web client's workspace plugin — the sidebar **Workspaces / Recents** tree with its row actions (pin, rename, fork, archive) and the conversation-hero **workspace picker** — packaged as an independent Cordis client plugin.

## Target generation

Vendored from the harness revision that built the **dsh 0.2.0-rc.2** client: `c1b47e41fc` (`release(dsh): 0.2.0-rc.2`), whose in-tree package is `@deepseek-ai/dsh-client-ui-workspace@0.2.0-rc.2`. The 2026-09-29 Desktop build runs exactly this code: its `//#region lib/types/client/...` module list, its `dsh.client.inject` list, and its `lib/index.js` node half all match this revision byte for byte.

Load it against that generation, or one that still carries the same client module table. A bundle that requires UI atoms its host does not export never registers its slots — and because `cordis.patch.yml` disables the in-tree `ui-workspace` row, the sidebar's workspace region then renders **empty**. That is the failure mode this port fixes; check a new generation before switching, as described under [Verification](#verification).

## Layout

```
src/index.ts                  node half — empty apply so the row exists in the host composition
src/client/index.ts           apply: registrations + the ctx.uiWorkspace service
src/client/contract/slots.ts  slot owner/occupant contracts
src/client/rows/…             WorkspaceBrowser, Rows, AnimatedRows
src/client/session-actions/…  pin / rename / fork / archive rows, toast
src/client/navigation.ts      workspace archive + directory-flow capability
src/client/{tree,stores,pin-order,shortcuts,locales}.ts
cordis.patch.yml              bundle patch: disable ui-workspace, insert this plugin
cordis.patch.dev.yml          the same swap with an absolute path, for `--patch` runs
scripts/build-client.mjs      emits lib/client.js through the harness client preset
```

## Install

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

The plugin manager in the GUI does the same. `cordis.patch.yml` is declared by `dsh.bundle.patch`, so it must stay in `files`: a packed package (git or npm install) that lacks it is rejected with `failed to read overlay`.

Because this plugin claims the same slots, locale namespace (`workspace`) and `ctx.uiWorkspace` service as the in-tree plugin, the patch disables `ui-workspace` and loads this one instead — never both.

## Build

```powershell
pnpm install
pnpm run typecheck              # against the generation pinned in devDependencies
pnpm run build                  # tsc: src -> lib/types (the client preset consumes this)
node scripts/build-client.mjs   # harness client preset: lib/types -> lib/client.js + lib/index.js
```

`scripts/build-client.mjs` uses the client-bundle preset from a dsh source checkout (`packages/client/tsdown.client.ts`, default `..\..\deepseek-harness`, override with `$DSH_HARNESS` or an argument). The preset resolves a package through `packages/<group>/<dir>/package.json`, so the script stages a temporary face package inside the checkout, links this repo's `node_modules` into it, runs tsdown for the Client face, copies the artifacts back, and deletes the staging directory. The checkout itself is left untouched.

## Verification

The gate that catches a wrong generation is the pinned type surface: `devDependencies` fixes every `@deepseek-ai/*` package to the target generation (`0.2.0-rc.2`), so `pnpm run typecheck` fails on any atom, prop or service that generation does not have. Before switching generations, re-pin those versions and fix what the typecheck reports.

For a runtime-level check, compare what the bundle requires against the host build:

1. Extract the host's own copy of the plugin — `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js` inside `resources/app.asar` — and its `lib/index.js`.
2. Diff the required member sets per external module (`_deepseek_ai_dsh_client_ui_primitives.X`, `_deepseek_ai_dsh_client_store.X`, `_deepseek_ai_cordis.X`, `react.X`, `react_jsx_runtime.X`) and the `//#region lib/types/...` module list between that file and `lib/client.js`. Both must be equal or a subset; extra members mean the host cannot satisfy the bundle.
3. Check each required primitives symbol against the host's export list (the single `export { … }` line that names `IconSearchOutlineMedium`).

## Known gaps and deliberate differences

- **No extra folders, no project editor.** Those are newer harness features (`addFolder` / `removeFolder` / `setPrimaryFolder` on the workspace controller); the 0.2.0-rc.2 host does not implement them, so this generation's UI has no project editor and no editable source-folder list.
- `src/` is vendored from a released revision rather than hand-written: re-vendor it when moving to another generation instead of patching around the differences.
- No package tests; the in-tree suite stays in `packages/client/ui-workspace/tests` at the vendored revision.
