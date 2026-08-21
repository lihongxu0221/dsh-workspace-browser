# dsh-workspace-browser

DeepSeek Harness 工作区浏览器（侧边栏的 **Workspace / Session 树** `WorkspaceBrowser` 及其 **添加工作区流程** `WorkspacePickFlow`）的独立抽取，作为一个独立的 Cordis client 插件。

本次抽取基于 deepseek-harness 的 **winexeBuilder 分支**，该分支为侧边栏树加入了折叠／置顶／Recents 视图、Codex 风格的项目编辑器，以及主目录／额外文件夹管理。插件源码取自该分支的 `packages/client/ui-workspace`，并收敛为单个 `sidebar.workspaces` 注册；harness 仓库未被修改。

## 必需：winexeBuilder 数据层

折叠／置顶树、编辑对话框和主目录／额外文件夹控制，依赖**只存在于 winexeBuilder 分支（而非 master）** 的数据层新增：

- `workspace/workspace` — `WorkspaceView.folders`、主目录、额外文件夹（`src/folders.ts`）。
- `client/runtime` — `ctx.workspaces.addFolder` / `removeFolder` / `setPrimaryFolder`。
- `host/apiproxy` — 文件夹／主目录的工作区 API。

要运行此插件，harness 必须是 winexeBuilder 分支（或已另外包含上述改动）；否则 `ctx.workspaces.addFolder(...)` 等方法不存在，插件无法通过类型检查或运行。

## 结构

```
src/
  index.ts                 node 侧（空 apply —— 宿主生命周期占位）
  invariant.ts             invariant companion
  client/
    index.ts               apply：注册 sidebar.workspaces
    contract/slots.ts      DirectoryFlowOwnerProps + 浏览器 prop/inject 份额
    WorkspaceBrowser.tsx   侧边栏树区域
    WorkspacePickFlow.tsx  添加工作区菜单 + 目录流错误弹窗
    WorkspaceEditDialog.tsx
    tree.ts / stores.ts / rows/ / locales.ts
    *.module.css
```

## 注册

该插件声明一个 slot 入口和一个 `single` 子 hole：

- `sidebar.workspaces` → `WorkspaceBrowser`（由 `ui-sidebar` 声明）
- `sidebar.workspaces.directoryFlow` → 由目录选择占用方（`-native` / `-browse`）填充

属主契约 `DirectoryFlowOwnerProps` 从本包导出，供组合的目录选择器为其占用方做类型标注。

## 依赖（peer）

`@deepseek-ai/dsh-client-runtime`、`dsh-client-ui-slots`、`dsh-client-ui-sidebar`、`dsh-client-ui-primitives`、`dsh-client-connection`、`dsh-client-locale`、`dsh-invariants` 与 `@deepseek-ai/cordis`。这些都是 deepseek-harness 的 workspace 包，版本 `0.1.0-rc.8`。

## 针对 deepseek-harness 的本地开发

harness 包尚未发布到 npm，且内部依赖使用 `workspace:` 协议，因此 `npm install` 无法从 registry 解析。两条路径：

1. **类型检查**：`tsconfig.json` extends `../deepseek-harness/tsconfig.base.json`（winexeBuilder 分支），把 `@deepseek-ai/*` 解析到 harness 源码图。从 harness 内部运行：

   ```
   pnpm exec tsc -p ../dsh-workspace-browser/tsconfig.json
   ```

2. **包链接**：harness 包发布后，把 `peerDependencies` 切到 npm registry 再 `pnpm install`。在此之前，把本包加入 harness 的 `cordis.yml` profile（或用 `pnpm link`）来加载。

## 加载进 harness profile

把包名加入 web profile 的 `dsh.client` 行（与 harness 处理 `ui-workspace` 的方式一致）。由于 `sidebar.workspaces` 由 `ui-sidebar` 声明，现有 `ui-workspace` 的浏览器与本次抽取都会占用同一个 hole —— 二选一加载，不可同时。