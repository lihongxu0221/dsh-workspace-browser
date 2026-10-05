# dsh-workspace-browser

独立的 Cordis client 插件：把出厂 dsh Web 客户端**没有**的工作区功能补上——侧边栏 **最近会话（Recents）** 分区、可折叠的分区头、带额外源文件夹的 **项目编辑器**、置顶/重命名/派生/归档等行操作、搜索、快捷键，以及会话英雄区的 **workspace picker**。

## 为什么存在

已部署客户端（**0.2.0-rc.2**，2026-09-29 桌面端构建）的工作区浏览器没有最近会话、没有可折叠分区、也没有项目编辑器。本插件用 harness `winexeNew` 分支上功能完整的实现替换该区域。

`cordis.patch.yml` 停用树内的 `ui-workspace` 行——两者抢占同一批 slot、同一 `workspace` 语言命名空间与同一个 `ctx.uiWorkspace` 服务——改载本插件。因此若本插件的 slot 没能注册，工作区区域会**整块空白**；这也是安装前必须先核对客户端依赖面（见「验证」）的原因。

## 宿主能力探测

额外源文件夹是唯一需要宿主支持的功能：`addFolder`、`removeFolder`、`setPrimaryFolder` 以及工作区视图上的 `folders` 投影只存在于更新的 workspace controller。[src/client/host-capabilities.d.ts](src/client/host-capabilities.d.ts) 把它们声明为可选，`apply` 在运行期探测：

- 宿主有 → 项目编辑器可用，源文件夹功能正常；
- 宿主没有（已部署的 0.2.0-rc.2 构建）→ 行菜单不再出现「编辑项目」，插件绝不调用缺失的方法；最近会话、可折叠分区、置顶、重命名/派生/归档、搜索、快捷键照常工作。

标签 `appgen-0.3.0` 保留了更早那版"仅对齐宿主功能"的构建（功能集与宿主完全一致），供缺少新客户端模块表的宿主使用。

## 目录

```
src/index.ts                        node 半边——空 apply，仅让该行出现在宿主组合里
src/client/index.ts                 apply：插槽注册、ctx.uiWorkspace 服务、能力探测
src/client/host-capabilities.d.ts   宿主可选的文件夹 API，以及为何可选
src/client/contract/slots.ts        插槽 owner/occupant 契约
src/client/rows/…                   WorkspaceBrowser、SessionTree、Rows、AnimatedRows
src/client/session-actions/…        置顶 / 重命名 / 派生 / 归档 行操作与提示
src/client/WorkspaceEditDialog.tsx  项目编辑器：标题、源文件夹、主要文件夹
src/client/{tree,stores,pin-order,shortcuts,navigation,locales}.ts
cordis.patch.yml                    组合包补丁：停用 ui-workspace，插入本插件
cordis.patch.dev.yml                同样替换，但用绝对路径，供 --patch 使用
scripts/build-client.mjs            经 harness 的 client 预设产出 lib/client.js
```

## 安装

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

GUI 里的插件管理器等价。`cordis.patch.yml` 由 `dsh.bundle.patch` 声明，必须留在 `files` 里：打包后（git 或 npm 安装）缺了它，DSH 会以 `failed to read overlay` 拒绝安装。

## 构建

```powershell
pnpm install
pnpm run typecheck              # 对着 devDependencies 里钉住的世代做类型检查
pnpm run build                  # tsc：src -> lib/types（client 预设消费它）
node scripts/build-client.mjs   # harness 的 client 预设：lib/types -> lib/client.js + lib/index.js
```

`scripts/build-client.mjs` 使用 dsh 源码 checkout 里的 client 打包预设（`packages/client/tsdown.client.ts`，默认 `..\..\deepseek-harness`，可用 `$DSH_HARNESS` 或参数覆盖）。该预设通过 `packages/<group>/<dir>/package.json` 定位包，所以脚本会在 checkout 内临时放一个"门面包"，把本仓库的 `node_modules` 链进去，按 Client 构建面跑 tsdown，把产物里夹带的 checkout 路径归一化，拷回后删除临时目录——checkout 本身不留改动。

## 验证

1. **类型面**：`devDependencies` 把每个 `@deepseek-ai/*` 固定到更新的已发布世代（`0.2.1-alpha.1`），任何该世代没有的原子、prop 或服务都会让 `pnpm run typecheck` 失败。三个宿主文件夹 API 有意不在已发布类型里，改为本地声明的可选能力——插件能同时为两种宿主编译，靠的就是这一点。
2. **产物依赖面**：与宿主构建对比——从 `resources/app.asar` 取出宿主自带的 `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js`，比较两者的 `//#region lib/types/...` 模块清单、以及每个模块表条目被用到的成员集合（`_deepseek_ai_dsh_client_ui_primitives.X`、`_deepseek_ai_dsh_client_store.X`、`_deepseek_ai_dsh_cordis.X`、`react.X`、`react_jsx_runtime.X`），并把用到的 primitives 符号逐个对照宿主那条 `export { … }` 清单。「多出来的模块」（项目编辑器）与「多出来的成员」只有在宿主确实导出它们时才算安全。
3. **运行期**：用宿主自带的运行时 + 一次性 profile 装上本插件启动，再用无头浏览器加载其界面，断言新增功能确实渲染（树内插件没有的 `最近会话 / Recents` 分区）、在缺少文件夹 API 的宿主上项目编辑器不出现、且控制台无错误。

## 已知缺口

- **额外文件夹需要宿主支持。** 在已部署的 0.2.0-rc.2 宿主上，项目编辑器是"不显示"而不是"报错"：那里的数据层不存在，而外部插件无法给宿主添加 workspace API。要让它在该宿主上可用，得由插件自建文件夹存储与按文件夹的会话分组——这一步有意尚未做。
- `src/` 取自 `winexeNew` 而非手写：换宿主世代时整份重新取用，并保留能力探测。
- 无包内测试；树内测试留在所取用修订的 `packages/client/ui-workspace/tests`。
