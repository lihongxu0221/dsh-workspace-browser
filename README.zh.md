# dsh-workspace-browser

DeepSeek Harness 工作区插件的独立抽取：侧边栏 **Workspace / Session 树**（`WorkspaceBrowser`）、**最近会话**、额外文件夹的 **项目编辑器**，以及会话英雄区的 **WorkspacePicker**，作为一个独立的 Cordis client 插件。

本次抽取基于 deepseek-harness 的 **winexeNew** 分支（`packages/client/ui-workspace`）；harness 仓库未被修改。

## 必需：winexeNew 数据层

折叠／置顶／Recents、项目编辑器，以及主目录／额外文件夹控制，依赖 **winexeNew** 上的 Workspace Controller API（不含这些改动的 `master` 不够）：

- `workspace/workspace` — `WorkspaceView.folders`、主目录、额外文件夹（`src/folders.ts`）。
- `api/workspace-controller` — `addFolder` / `removeFolder` / `setPrimaryFolder`。
- Client 拆分包 — `dsh-api-session-controller`、`dsh-api-workspace-controller`、`dsh-client-store`、`dsh-util-workspace-path`（该分支没有 `dsh-client-runtime`）。

要运行此插件，harness 必须是 winexeNew（或已另外包含上述包）；否则 `ctx.workspaces.addFolder(...)` 等方法不存在，插件无法通过类型检查或运行。

## 结构

```
src/
  index.ts                 node 侧（空 apply —— 宿主生命周期占位）
  client/
    index.ts               apply：provideRoot + sidebar.workspaces + conversation.hero.workspace
    contract/slots.ts      DirectoryFlowOwnerProps + 浏览器／选择器 prop/inject 份额
    navigation.ts          ctx.uiWorkspace（打开／新建／分叉／归档）
    rows/WorkspaceBrowser.tsx
    WorkspacePicker.tsx    添加工作区菜单 + 目录流错误弹窗 + 英雄区包装
    WorkspaceEditDialog.tsx
    tree.ts / stores.ts / subagent-lineage.ts / locales.ts
    *.module.css
```

## 注册

该插件声明两个 slot 入口和两个 `single` 子 hole：

- `sidebar.workspaces` → `WorkspaceBrowser`（由 `ui-sidebar` 声明）
- `sidebar.workspaces.directoryFlow` → 由目录选择占用方（`-native` / `-browse`）填充
- `conversation.hero.workspace` → `WorkspacePicker`（由 `ui-conversation` 声明）
- `conversation.hero.workspace.directoryFlow` → 同一占用方家族

同时绑定全局 `useWorkspaces` hook（`slots.provideRoot`）并发布 `ctx.uiWorkspace`。

属主契约 `DirectoryFlowOwnerProps` 从本包导出，供组合的目录选择器为其占用方做类型标注。

## 互斥

`sidebar.workspaces`、`conversation.hero.workspace`、`workspace` locale 命名空间和 `ctx.uiWorkspace` 与 in-tree `@deepseek-ai/dsh-client-ui-workspace` 是同一组身份，**二选一加载，不可同时**。

## 依赖（peer）

`@deepseek-ai/cordis`、`dsh-api-remotes`、`dsh-api-session-controller`、`dsh-api-workspace-controller`、`dsh-client-connection`、`dsh-client-locale`、`dsh-client-store`、`dsh-client-ui-conversation`、`dsh-client-ui-layout`、`dsh-client-ui-primitives`、`dsh-client-ui-renderer`、`dsh-client-ui-session`、`dsh-client-ui-sidebar`、`dsh-client-ui-slots`、`dsh-schedule`、`dsh-session` 与 `dsh-util-workspace-path`。这些都是 winexeNew 上的 deepseek-harness workspace 包。

## 针对 deepseek-harness 的本地开发

harness 包尚未发布到 npm，且内部依赖使用 `workspace:` 协议，因此 `npm install` 无法从 registry 解析。两条路径：

1. **类型检查**：`tsconfig.json` extends `../../deepseek-harness/tsconfig.base.client.json`，并把 `@deepseek-ai/*` 映射到 winexeNew 的 `lib/types`（checkout：`D:\GitLocal\deepseek-harness`）。从 harness 运行：

   ```
   .\node_modules\.bin\tsc.cmd -p ..\DSH\dsh-workspace-browser\tsconfig.json
   ```

2. **包链接**：harness 包发布后，把 `peerDependencies` 切到 npm registry 再 `pnpm install`。在此之前，把本包加入 harness 的 `cordis.yml` profile（或用 `pnpm link`），并 **替换** `ui-workspace`。

## 在 DSH Web GUI 中使用

本包自带配置补丁与构建好的产物 `lib/`。

- `cordis.patch.yml` — `dsh.bundle.patch` 声明的组合包补丁，按包名插入插件行，安装后的副本加载的就是它。必须留在 `files` 里，否则打包出来的包（git / npm 安装）不含该文件，DSH 会以 `failed to read overlay` 拒绝安装。
- `cordis.patch.dev.yml` — 同样的替换，但用绝对路径，供不安装、直接跑本目录时使用。

### 方式一：命令行启动时挂载补丁（最快捷）

在 `deepseek-harness` 根目录下执行：

```powershell
pnpm dsh web --patch D:\GitLocal\DSH\dsh-workspace-browser\cordis.patch.dev.yml
```

启动后在浏览器访问或整页刷新 `http://127.0.0.1:8080`，即可看到本插件生效。

验证配置是否正确覆盖：

```powershell
pnpm dsh web --patch D:\GitLocal\DSH\dsh-workspace-browser\cordis.patch.dev.yml --dump-config
```

在输出中应能看到原版 `ui-workspace` 的 `disabled: true`，且新增加了本插件 `ui-workspace-browser`。

### 方式二：持久安装进 profile

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

DSH 校验通过后会把 `cordis.patch.yml` 作为 profile 层追加进去；本地目录同样可以（`dsh plugin --profile desktop add D:\GitLocal\DSH\dsh-workspace-browser`）。

## 已知缺口

- 无包内测试（in-tree 覆盖仍在 `packages/client/ui-workspace/tests`）。
- 类型检查读 harness `lib/types`，并用 `src/client/harness-lib-shims.d.ts` 补上 `IWorkspaces.unarchiveSession`（winexeNew 源码有，最近一次 emit 没有）。
- 后续 in-tree `ui-workspace` 变更不会自动同步。
- `files` 是白名单，profile 安装拿到的只有打包内容：运行时要从包目录读取的任何文件（现在是补丁文件，以后可能是数据文件）都必须列进去。
