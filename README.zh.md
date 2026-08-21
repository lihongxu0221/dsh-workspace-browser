# dsh-workspace-browser

DeepSeek Harness 工作区浏览器（侧边栏的 **Workspace / Session 树** `WorkspaceBrowser` 及其 **添加工作区流程** `WorkspacePickFlow`）的独立抽取，作为一个独立的 Cordis client 插件。源码取自 `packages/client/ui-workspace` 并收敛为单个 slot 注册；原始仓库未被修改。

`WorkspaceBrowser` 填充 `sidebar.workspaces` slot，提供分组／扁平 Session 树、会话搜索、Workspace 添加／重命名／编辑／重排序、额外文件夹与主文件夹管理，以及 Workspace 行菜单。

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

harness 包尚未发布到 npm，且其内部依赖用 `workspace:` 协议，因此 `npm install` 无法从 registry 解析。两条本地路径：

1. **类型检查**（无需 install）：`tsconfig.json` extends `../deepseek-harness/tsconfig.base.json`，`tsc -p tsconfig.json` 会直接把 `@deepseek-ai/*` 解析到相邻的 harness 源码。在本仓库运行：

   ```
   pnpm exec tsc -p tsconfig.json
   ```

2. **包链接**：harness 包发布后，把 `peerDependencies` 切到 npm registry 再 `pnpm install`。在此之前，把本包加入 harness 的 `cordis.yml` profile（或用 `pnpm link`）来加载。

## 加载进 harness profile

把包名加入 web profile 的 `dsh.client` 行（与 harness 处理 `ui-workspace` 的方式一致）。由于 `sidebar.workspaces` slot 由 `ui-sidebar` 声明，现有 `ui-workspace` 的浏览器与本次抽取都会占用同一个 hole —— 二选一加载，不可同时。