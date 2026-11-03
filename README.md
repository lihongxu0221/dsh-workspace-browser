# dsh-workspace-browser

Standalone Cordis client plugin that gives the shipped dsh web client the workspace features it does not have: the sidebar **Recents** section, collapsible section headers, the **project editor** with extra source folders, pin/rename/fork/archive row actions, search, shortcuts, and the conversation-hero **workspace picker**. In the project editor a folder's own name opens that folder in the OS file manager, and a conversation whose own folder has vanished is silently re-rooted to the Workspace's primary folder when it is opened.

## Why it exists

The 2026-09-29 Desktop build (**0.2.0-rc.2**) shipped a workspace browser with no Recents, no collapsible sections and no project editor. By **0.2.1-rc.2** the in-tree `ui-workspace` is that browser (toast factory, inline session-id copy, shared hover dwell, session watermarks, remote-access hooks) but still has no Recents section, no project editor and no folder API. This plugin still replaces that row: the rc.2 contracts come from the in-tree snapshot, and the plugin layer on top is Recents, the project editor, and the plugin-owned source-folder list.

`cordis.patch.yml` disables the in-tree `ui-workspace` row and inserts this package as `ui-workspace-browser`. A `name` override cannot do that swap: the include loader treats `name` as an identity check and skips the patch when it does not match, so the stock browser would keep running and this plugin's Recents, project editor, and source folders would never mount. Both claim the same slots, locale namespace (`workspace`) and `ctx.uiWorkspace` service, so only one may be enabled. While this bundle is selected, `ui-workspace-browser` must stay enabled — disabling only that row leaves nobody providing the service and web boot times out. A bundle whose slots never register therefore leaves the workspace region **empty**, which is why the client-half surface is checked against the host before any install (see Verification).

## Source folders on a host without the folder API

`addFolder` / `removeFolder` / `setPrimaryFolder` and the `folders` projection on a workspace view exist only on the newer workspace controller; the shipped host has none of them. The plugin owns the first two there:

- the folder list lives in the plugin's own persisted viewing store (`persist: 'dsh.workspace.view.v5'`) and is also written to `.dsh/storages/workspace-browser-folders.json`. A copied `.dsh` home carries that file; browser localStorage is outside `.dsh` and does not;
- the browser merges those folders into the Workspace list it derives from (`mergePluginFolders` in [src/client/tree.ts](src/client/tree.ts)) and attributes Sessions to a Workspace by matching their `cwd` against the list — the host leaves such Sessions ungrouped, so only unclaimed ones are borrowed;
- adding and removing folders works from the project editor exactly as it does on a newer host. Clicking a folder's own name opens that folder in the OS file manager — the *Set as primary* and remove buttons inside the row keep their own actions; a folder that has since disappeared says so inline in the dialog instead of only logging it.

The node half also tells the model about them. It registers a prompt context (`workspace-browser:folders`, order `SANDBOX_POLICY + 1`) that resolves the Session's Workspace from `ctx.workspaceRegistry` — membership first, then an exact `cwd` match, then the deepest folder containing the `cwd`, which is what finds a Session started in a promoted folder — and renders:

```
The session workspace "E:\proj" also includes these source folders: "D:\shared", "D:\other". Reads may use all of them; writes stay inside the primary folder unless the file policy above allows more.
```

That sentence is the whole mechanism: the host's `workspace-write` policy still resolves a single root (`session.header.cwd`), so the plugin can widen what the model *knows*, never what it may *write*. Under `danger-full-access` the write caveat is moot. Nothing is injected when the Workspace has no extra folder, when the Session is unknown to the registry, or when the host has no `systemPrompt` service.

*Set as primary* asks the node half to move the host record itself. The host exposes no remote repath API to call, so the node half drives the workspace registry's own write path in process (`POST /api/workspace-browser/primary`, [src/index.ts](src/index.ts)): it canonicalizes the directory with `realpath`, refuses a path that is missing, is not a directory, or that another Workspace already owns, and rewrites the record's `path` through `mutate`, so the host itself later treats the promoted folder as the Workspace path. The viewing store still records the promotion and keeps the previous directory as an extra folder, which is the fallback for a host that cannot be repathed; a refusal only warns, so the editor still switches. Later New Session creates with that `cwd` alone (the shipped host accepts a create that sends `cwd` and no `workspaceId`), and the browser borrows the Session back by `cwd`. The route also re-roots the Workspace's live Sessions whose own directory has disappeared, through the host's published `ctx.workingDirectory.set`; each Session keeps its own root, so one still rooted in an existing source folder is left alone, and a Session stranded on a deleted folder can be used again instead of failing every turn. The browser also asks for that move itself: before it makes a conversation current — at startup restore and on a row click — it posts that conversation to `POST /api/workspace-browser/reroot`, which resolves it through the host's session controller (resuming it when the host has not loaded it yet) and moves its root to the effective primary, so the next turn no longer assembles on the deleted folder. The primary route's own rescue is narrower: it only re-roots Sessions the host already has open. A new Session is only ever started in the effective primary folder: when that folder is missing or is no longer a directory the plugin refuses to create the Session and names the path, asking for the folder back or for an existing one to be set as primary, because the host's own Session creation would recreate the deleted directory as an empty one. The *New Session* action reports that refusal; a startup restore only logs it. A folder that is neither the primary nor listed among the Workspace's source folders was deliberately removed, and is never used as a root.

Where the host *does* expose the folder API ([src/client/host-capabilities.d.ts](src/client/host-capabilities.d.ts) declares the three methods optional), all three editor actions route to it instead.

The desktop window exposes the OS folder dialog (`__DSH_DIRECTORY_PICKER__`). When a LAN bind (`0.0.0.0`) has mounted the in-app "Select Workspace Directory" browser, the plugin still opens the OS dialog in that window. A remote browser has no bridge and keeps the composed in-app flow.

The tag `appgen-0.3.0` keeps an earlier parity-only build (exactly the host's own feature set) for a host that lacks the newer client module table.

## Layout

```
src/index.ts                        node half — folder-layer route, the host repath route, the conversation reroot route, the directory probe + the prompt context that names the folders
src/session-folders.ts              which workspace a Session belongs to, and the paragraph the prompt carries
src/client/index.ts                 apply: registrations, the ctx.uiWorkspace service, capability probe
src/client/host-capabilities.d.ts   the optional host folder APIs and why they are optional
src/client/folder-transition.ts     the pure add/remove/promote folder-layer math the store actions apply
src/client/contract/slots.ts        slot owner/occupant contracts
src/client/rows/…                   WorkspaceBrowser, SessionTree, Rows, AnimatedRows
src/client/session-actions/…        pin / rename / fork / archive / copy-id rows
src/client/toast/…                  rc.2 keyed toast registrations
src/client/WorkspaceEditDialog.tsx  project editor: title, source folders, primary folder
src/client/{tree,stores,pin-order,shortcuts,navigation,locales}.ts
cordis.patch.yml                    bundle patch: disable ui-workspace, insert this plugin
cordis.patch.dev.yml                the same swap with an absolute path, for `--patch` runs
scripts/build-client.mjs            emits lib/client.js through the harness client preset
scripts/bundle-node.mjs             emits lib/index.js from the tsc output (no checkout needed)
```

## Install

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

The GUI plugin manager does the same. `cordis.patch.yml` is declared by `dsh.bundle.patch`, so it must stay in `files`: a packed package (git or npm install) that lacks it is rejected with `failed to read overlay`.

The host composes plugin node halves at startup, so a change to `lib/index.js` shows up only after the app restarts — including the prompt context below, whose text is resolved at every Session prompt assembly. The client half is unaffected by that restart rule.

## Build

```powershell
pnpm install
pnpm run typecheck              # against the generation pinned in devDependencies
pnpm run build                  # tsc: src -> lib/types, then scripts/bundle-node.mjs -> lib/index.js
node scripts/build-client.mjs   # harness client preset: lib/types -> lib/client.js (+ lib/index.js)
```

`scripts/bundle-node.mjs` is the fallback for the node half when no harness checkout is available: it concatenates `lib/types` into the single-file `lib/index.js` the package entry names, which is exactly the transformation the preset's Node build face performs for these three modules. The client half still needs the preset.

`scripts/build-client.mjs` uses the client-bundle preset from a dsh source checkout (`packages/client/tsdown.client.ts`, default `..\..\deepseek-harness`, override with `$DSH_HARNESS` or an argument). The preset resolves a package through `packages/<group>/<dir>/package.json`, so the script stages a temporary face package inside the checkout, links this repo's `node_modules` into it, runs tsdown for the Client face, normalizes the checkout path out of the emitted banners, copies the artifacts back and deletes the staging directory. The checkout itself is left untouched.

## Verification

1. **Types.** `devDependencies` pins every `@deepseek-ai/*` package to the published generation this plugin targets (`0.2.1-rc.2`; cordis `^4.0.5`), so `pnpm run typecheck` fails on any atom, prop or service that generation lacks. The three host folder APIs are still absent from the published surface and are declared optional locally — the project editor falls back to the plugin's own store when they are missing. The client inject list also names `@deepseek-ai/dsh-api-remote-access`, which the rc.2 `remoteAccess` service comes from.
2. **Bundle surface.** Diff the bundle against the host build: extract the host's own `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js` from `resources/app.asar`, then compare the `//#region lib/types/...` module lists and the member sets required from each module-table entry (`_deepseek_ai_dsh_client_ui_primitives.X`, `…dsh_client_store.X`, `_deepseek_ai_dsh_cordis.X`, `react.X`, `react_jsx_runtime.X`), and check every required primitives symbol against the host's single `export { … }` list. Extra modules (the project editor) and extra members are fine only when the host exports them.
3. **Runtime.** Boot the host's own runtime against a throwaway profile with this bundle installed, then load the served UI in a headless browser and assert that the added features render: the `最近会话` / `Recents` section (the in-tree plugin has no such key), a workspace row menu that offers *编辑项目*, a project editor dialog carrying *源文件夹* and *添加文件夹*, and a console with no errors.

## Known gaps

- **A repath the host refuses leaves the registry path alone.** The shipped host publishes no remote repath API, so the node half moves the record through the registry's own write path. A host with no `workspaceRegistry` service — or one whose registry exposes neither `get` nor a movable entity — is refused with a message, and the viewing-store layer stays the fallback: the plugin remembers the promoted directory, starts new Sessions there while it still exists, and borrows them back by cwd. The browser warns instead of failing, and the editor still switches.
- **A Session whose folder was deleted is never restored into it.** Startup and New Session probe the directory over `GET /api/workspace-browser/directory` before reusing a blank Session or restoring the last one; a deleted `cwd` stays reachable under Recents, and the replacement Session starts at the Workspace's effective primary folder instead. When that primary folder has itself disappeared the plugin refuses the New Session with a message naming the path, so the host never recreates the deleted folder. Only a missing path (`ENOENT`/`ENOTDIR`) counts as gone — any other probe failure reads as present, so an unreadable directory keeps behaving as it did before.
- **An ambiguous folder names nothing.** Two Workspaces may list the same directory; a Session started there is then attributed to neither, and the prompt stays silent rather than guess (the host's own extra-root resolution bails the same way).
- **A re-root cannot move a conversation's recorded `cwd`.** The host's published write path is `ctx.workingDirectory.set`, which appends a `working-directory/change` event and never rewrites `session.header.cwd`. After a successful re-root the prompt, the tool working directory and the `@file` index follow the new root, but the host's workspace-files roots and the sidebar file tree still derive from the original deleted folder. That is a host limitation, not a plugin one; the Model can still be pointed at the real folder by naming it in the prompt.
- **A conversation that cannot be re-rooted keeps the old behaviour.** When the host has no session controller or working-directory service, the conversation cannot be resolved, it belongs to no known Workspace, or the host refuses the write, the browser warns and opens the conversation exactly as before — the first turn then fails the way it already did. Only a missing primary folder is reported to the user, with the same message the New Session refusal uses.
- **Folder membership is matched by Session `cwd`**, and only Sessions the host left ungrouped are borrowed. A Session that the host already groups under its own Workspace stays there.
- `src/` is the 0.2.1-rc.2 in-tree `ui-workspace` snapshot plus the plugin layer (Recents, project editor, folder persistence). Re-vendor the shared files when moving to another host generation and keep the capability probes.
- **Extra folders are readable, not writable, under `workspace-write`.** The host resolves one sandbox root (`session.header.cwd`), and a canonicalizing containment check rejects a junction or symlink that points outside it. Only the prompt context is plugin-owned; `danger-full-access` is the mode that makes the extras writable.
- Package tests cover the hover-card folder facts (`tests/hover-card.test.mjs`), the folder-selection logic (`tests/session-folders.test.mjs`), the folder-layer transitions including the promote-then-remove sequence and the dead-root re-root decision (`tests/folder-transition.test.mjs`) and the node half's routes — folders, primary, directory and reroot — plus prompt context (`tests/node-half.test.mjs`). The in-tree suite stays in `packages/client/ui-workspace/tests` at the vendored revision.
