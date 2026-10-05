# dsh-workspace-browser

dsh Web 客户端工作区插件的独立抽取：侧边栏 **Workspaces / Recents** 树（置顶、重命名、派生、归档等行操作）与会话英雄区的 **workspace picker**，打包为独立的 Cordis client 插件。

## 目标世代

源码取自构建 **dsh 0.2.0-rc.2** 客户端的那个 harness 修订：`c1b47e41fc`（`release(dsh): 0.2.0-rc.2`），其树内包为 `@deepseek-ai/dsh-client-ui-workspace@0.2.0-rc.2`。2026-09-29 的桌面端构建跑的正是这份代码：它的 `//#region lib/types/client/...` 模块清单、`dsh.client.inject` 列表、以及 `lib/index.js`（node 半边）都与该修订逐字节一致。

请在这一代（或仍带同一套客户端模块表的后续世代）上加载。若 bundle 需要的 UI 原子在宿主里不存在，它的 slot 根本不会注册；而 `cordis.patch.yml` 又关掉了树内的 `ui-workspace` 行，于是侧边栏的工作区区域**整块空白**——这正是本次移植要修掉的现象。切到新世代前请按 [兼容性验证](#兼容性验证) 先核对。

## 目录

```
src/index.ts                  node 半边——空 apply，仅让该行出现在宿主组合里
src/client/index.ts           apply：插槽注册 + ctx.uiWorkspace 服务
src/client/contract/slots.ts  插槽 owner/occupant 契约
src/client/rows/…             WorkspaceBrowser、Rows、AnimatedRows
src/client/session-actions/…  置顶 / 重命名 / 派生 / 归档 行操作与提示
src/client/navigation.ts      工作区归档与目录选择能力
src/client/{tree,stores,pin-order,shortcuts,locales}.ts
cordis.patch.yml              组合包补丁：停用 ui-workspace，插入本插件
cordis.patch.dev.yml          同样替换，但用绝对路径，供 --patch 使用
scripts/build-client.mjs      经 harness 的 client 预设产出 lib/client.js
```

## 安装

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

GUI 里的插件管理器等价。`cordis.patch.yml` 由 `dsh.bundle.patch` 声明，必须留在 `files` 里：打包后（git 或 npm 安装）缺了它，DSH 会以 `failed to read overlay` 拒绝安装。

本插件与树内插件抢占同一批 slot、同一 `workspace` 语言命名空间与同一个 `ctx.uiWorkspace` 服务，因此补丁停用 `ui-workspace`、改载本插件，两者不要同时加载。

## 构建

```powershell
pnpm install
pnpm run typecheck              # 对着 devDependencies 里钉住的世代做类型检查
pnpm run build                  # tsc：src -> lib/types（client 预设消费它）
node scripts/build-client.mjs   # harness 的 client 预设：lib/types -> lib/client.js + lib/index.js
```

`scripts/build-client.mjs` 使用 dsh 源码 checkout 里的 client 打包预设（`packages/client/tsdown.client.ts`，默认 `..\..\deepseek-harness`，可用 `$DSH_HARNESS` 或参数覆盖）。该预设通过 `packages/<group>/<dir>/package.json` 定位包，所以脚本会在 checkout 内临时放一个"门面包"，把本仓库的 `node_modules` 链进去，按 Client 构建面跑 tsdown，把产物拷回后删除临时目录——checkout 本身不留改动。

## 兼容性验证

真正能挡住"世代错配"的门禁是**钉住的类型面**：`devDependencies` 把每个 `@deepseek-ai/*` 固定到目标世代（`0.2.0-rc.2`），于是任何该世代没有的原子、prop 或服务都会让 `pnpm run typecheck` 直接失败。切换世代时，先重新钉版本，再按类型检查的报错改。

需要更贴近运行期的核对时，把 bundle 的依赖面与宿主构建对比：

1. 从 `resources/app.asar` 里取出宿主自带的那份 `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js` 及其 `lib/index.js`。
2. 对比两者的 `//#region lib/types/...` 模块清单，以及每个外部模块被用到的成员集合（`_deepseek_ai_dsh_client_ui_primitives.X`、`_deepseek_ai_dsh_client_store.X`、`_deepseek_ai_cordis.X`、`react.X`、`react_jsx_runtime.X`）。两者必须相同或为子集；多出来的成员意味着宿主满足不了这份 bundle。
3. 逐个核对用到的 primitives 符号是否出现在宿主的导出清单里（即那条以 `IconSearchOutlineMedium` 出现的 `export { … }`）。

## 已知缺口与有意差异

- **没有额外文件夹、没有项目编辑器。** 那是更新世代的 harness 能力（workspace controller 的 `addFolder` / `removeFolder` / `setPrimaryFolder`），0.2.0-rc.2 宿主没有实现，因此这一代的 UI 里没有项目编辑器，也没有可编辑的源文件夹列表。
- `src/` 是从已发布修订整份取用而非手写：换世代时整份重新取用，不要在差异上打补丁。
- 无包内测试；树内测试留在所取用修订的 `packages/client/ui-workspace/tests`。
