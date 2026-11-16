# dsh-workspace-browser

独立的 Cordis client 插件：在保留工作区浏览器全部原有能力的基础上，整合
`@michengai/dsh-codex-ui` 的输入增强、主题、设置工作台、侧栏面板导航、工作区
分区、会话未读、智能标题、桌面菜单、移动端布局和生态依赖管理。

原有能力包括侧边栏 **最近会话（Recents）** 分区、可折叠的分区头、带额外源文件夹的
**项目编辑器**、置顶/重命名/派生/归档等行操作、搜索、快捷键，以及会话英雄区的
**workspace picker**。

## 整合后的功能

工作区浏览器：

- 工作区树、平铺列表、Recents、搜索、归档筛选、手动/更新时间排序。
- 会话行置顶、重命名、派生、归档、取消归档、复制 Session ID。
- 项目编辑器：标题、主文件夹、额外源文件夹、设为主要、打开目录。
- 插件自有源文件夹持久化，以及 `workspace-browser:folders` prompt 上下文。
- 目录存在性探测、打开会话前 reroot、workspace picker、快捷键与 toast。

可选工作区分区（默认关闭）：

- 置顶、项目、自定义分区；分区折叠、改名、排序、删除。
- 工作区通过行菜单移动到其他分区；跨区拖拽；未归属工作区自动进入“项目”。
- 从分区标题直接添加工作区，并自动归位到该分区。
- 分区数据并入 `dsh.workspace.view.v5`，同时通过现有 folder layer 写入
  `.dsh/storages/workspace-browser-folders.json`。

面板导航（默认关闭）：

- 从 `sidebar.panellist` 读取插件面板，渲染常驻/更多两区。
- 支持固定、取消固定、跨区拖拽、点击切换面板。
- 不隐藏、不克隆宿主原生侧栏节点。

输入增强（默认开启）：

- 行内意图预测与续写，Tab 接受，Alt+Up/Down 切换候选，Esc 退出。
- 三段模式：关闭、仅续写、推测加续写；预测模型、推理强度、候选数可配。
- 空输入框 Up/Down 召回输入历史，作用域为当前会话或同 cwd 工作区。
- 输入框宽度拖拽、新会话建议卡片、Composer 设置卡片。

主题与设置：

- 14 套内置主题、清透/标准/磨砂三档玻璃、平铺玻璃/云母双排版、地面光斑。
- 默认主题 `stock`，玻璃默认关闭；只有显式选择后才写全局设计 Token。
- 原生设置皮肤：全屏双岛、分类导航、原生输入框搜索、Ambient Ground。
- 设置里的 Workspace Browser 页面：主题、Composer、生态插件、关于与反馈。

其他子插件：

- 会话智能标题：首条消息生成标题，失败或歧义时回退宿主默认标题。
- 桌面菜单：Electron 标题栏帮助菜单、刷新页面、重启应用与 Host。
- 移动端布局：窄屏撑满视口、安全区、44px 触控、16px 输入、浮层夹入视口。
- 八语言：中、英、日、西、法、德、俄、葡。
- 生态依赖管理：受管插件安装状态、版本、npm 下载量、单个升级、一键更新。

`cordis.patch.yml` 保留 `ui-workspace` 禁用和本插件根入口，并额外插入六个子插件：
`workspace-browser-session-title`、`workspace-browser-theme`、
`workspace-browser-settings-skin`、`workspace-browser-composer`、
`workspace-browser-sidebar`、`workspace-browser-desktop-menu`。每个子插件都可以
单独停用；根入口仍然只强制依赖 `connection`。

完整的逐项对照、冲突处理和验证记录见 [INTEGRATION.md](INTEGRATION.md)。

## 为什么存在

2026-09-29 桌面端构建（**0.2.0-rc.2**）的工作区浏览器没有最近会话、没有可折叠分区、也没有项目编辑器。到 **0.2.1-rc.2**，树内 `ui-workspace` 已经是那套浏览器（toast 工厂、行内复制 Session ID、共享悬停停留、会话水位线、远程访问 hook），但仍然没有最近会话分区、没有项目编辑器、也没有文件夹 API。本插件仍替换该行：rc.2 的契约取自树内快照，插件层补上的是最近会话、项目编辑器和插件自有的源文件夹列表。

`cordis.patch.yml` 停用树内的 `ui-workspace` 行，再把本包插成 `ui-workspace-browser`。不能靠改 `name` 完成这次替换：include 加载器把 `name` 当成身份校验，对不上就整段跳过，出厂浏览器会继续跑，本插件的最近会话、项目编辑器和源文件夹都不会挂上。两者抢占同一批 slot、同一 `workspace` 语言命名空间与同一个 `ctx.uiWorkspace` 服务，所以只能启用一个。本包被选为 bundle 时，`ui-workspace-browser` 必须保持启用——只禁用这一行就没有人提供该服务，Web 启动会超时。因此若本插件的 slot 没能注册，工作区区域会**整块空白**；这也是安装前必须先核对客户端依赖面（见「验证」）的原因。

## 宿主没有文件夹 API 时的源文件夹

`addFolder` / `removeFolder` / `setPrimaryFolder` 以及工作区视图上的 `folders` 投影只存在于更新的 workspace controller；出厂宿主一个都没有。前两者由插件自己承担：

- 文件夹列表存在插件自己的持久化视图 store 里（`persist: 'dsh.workspace.view.v5'`），并同时写入 `.dsh/storages/workspace-browser-folders.json`。整份 `.dsh` 拷到另一台设备时带的是这份文件；浏览器 localStorage 不在 `.dsh` 里，不会跟着走；
- 浏览器把这些文件夹并入它派生的 Workspace 列表（[src/client/tree.ts](src/client/tree.ts) 的 `mergePluginFolders`），并按会话 `cwd` 是否落在列表内把会话归到该工作区——宿主会把这些会话留作未分组，所以只"借用"未被任何工作区认领的会话；
- 在项目编辑器里添加/移除文件夹，行为与更新宿主上一致。

node 半边还会把这些文件夹告诉模型：它注册一个 prompt 上下文（`workspace-browser:folders`，order 为 `SANDBOX_POLICY + 1`），先用 `ctx.workspaceRegistry` 定位会话所属工作区——先看会话是否在成员列表里，再比 `cwd` 与主要文件夹/宿主路径是否相等，最后取包含 `cwd` 的最深文件夹（这是"在提升后的主要文件夹里新建会话"能被认出来的原因）——然后渲染：

```
The session workspace "E:\proj" also includes these source folders: "D:\shared", "D:\other". Reads may use all of them; writes stay inside the primary folder unless the file policy above allows more.
```

机制就这一句话：宿主的 `workspace-write` 仍只解析单一根目录（`session.header.cwd`），所以插件能扩宽的是模型**知道**的范围，而不是它能**写**的范围。`danger-full-access` 下这句写权限的提醒已无意义。工作区没有额外文件夹、会话不在注册表里、或宿主没有 `systemPrompt` 服务时，什么都不会注入。

*设为主要* 在宿主没有该 API 时由插件自己做：被提升的目录记在同一个视图 store 里，旧的宿主目录退成额外源文件夹。之后的「新建会话」用这个目录作为 `cwd` 单独创建（出厂宿主接受只带 `cwd`、不带 `workspaceId` 的创建），浏览器再按 `cwd` 把会话借回该工作区。宿主注册表里的工作区路径本身不变。

当宿主**确实**提供文件夹 API 时（[src/client/host-capabilities.d.ts](src/client/host-capabilities.d.ts) 把这三个方法声明为可选），三个编辑器动作都改走宿主。

桌面端窗口带有操作系统文件夹对话框（`__DSH_DIRECTORY_PICKER__`）。宿主若因为局域网绑定（`0.0.0.0`）改挂了应用内的「选择工作区目录」，插件在桌面窗口里仍直接打开系统对话框；没有这个桥的远程浏览器继续用应用内浏览器。

标签 `appgen-0.3.0` 保留了更早那版"仅对齐宿主功能"的构建（功能集与宿主完全一致），供缺少新客户端模块表的宿主使用。

## 目录

```
src/index.ts                        node 半边——文件夹路由、依赖页路由、prompt 上下文
src/session-folders.ts              会话属于哪个工作区，以及 prompt 里那句话
src/client/index.ts                 apply：插槽注册、ctx.uiWorkspace 服务、全部扩展挂载
src/client/host-capabilities.d.ts   宿主可选的文件夹 API，以及为何可选
src/client/contract/slots.ts        插槽 owner/occupant 契约
src/client/rows/…                   WorkspaceBrowser、SessionTree、Rows、AnimatedRows
src/client/session-actions/…        置顶 / 重命名 / 派生 / 归档 / 复制 ID 行操作
src/client/toast/…                  rc.2 的 keyed toast 注册
src/client/PanelNav.tsx             当前树内的面板导航（默认关闭）
src/client/sections/                分区纯模型与排序
src/client/WorkspaceEditDialog.tsx  项目编辑器：标题、源文件夹、主要文件夹
src/client/composer/                预测、续写、输入历史、宽度、建议、设置卡片
src/client/theme/                   14 套主题、玻璃、Token 注入
src/client/settings-skin/           全屏双岛设置工作台
src/client/sidebar/session-unread/  会话未读菜单
src/client/desktop-menu/            Electron 标题栏帮助菜单
src/client/AboutSection.tsx         主题/Composer/生态插件/关于
src/client/mobile-web.ts            移动端布局增强
src/client/{tree,stores,pin-order,shortcuts,navigation,locales}.ts
src/client/codex-locales.ts         整合功能的八语言词典
src/composer-plugin.ts              输入增强 Host 入口
src/settings-skin-plugin.ts         设置皮肤 Host 入口
src/sidebar-plugin.ts               侧栏 Host 入口
src/theme-plugin.ts                 主题 Host 入口
src/desktop-menu-plugin.ts          桌面菜单 Host 入口
src/session-title-plugin.ts         智能标题 Host 入口
cordis.patch.yml                    组合包补丁：停用 ui-workspace，插入根入口与六个子插件
cordis.patch.dev.yml                同样替换，但用绝对路径，供 --patch 使用
scripts/build-client.mjs            经 harness 的 client 预设产出 lib/client.js
scripts/bundle-node.mjs             esbuild 多入口，产出 lib/index.js 与六个子插件入口
```

## 安装

```powershell
dsh plugin --profile desktop add github:lihongxu0221/dsh-workspace-browser
```

宿主在启动时组合各插件的 node 半边，所以 `lib/index.js` 的改动能生效的前提是重启 App——包括下文那个在每次组装会话 prompt 时解析的上下文。client 半边不受这条限制。

GUI 里的插件管理器等价。`cordis.patch.yml` 由 `dsh.bundle.patch` 声明，必须留在 `files` 里：打包后（git 或 npm 安装）缺了它，DSH 会以 `failed to read overlay` 拒绝安装。

## 构建

```powershell
pnpm install
pnpm run typecheck              # 对 devDependencies 里钉住的 0.2.2-rc.2 做类型检查
pnpm run contract-check         # 校验 peer 依赖、源码 import、named export、client inject
pnpm run build                  # tsc -> lib/types，再由 esbuild 产出七个 node 入口
node scripts/build-client.mjs 'E:\AI\Agents\Deepseek Harness\Code'
pnpm test                       # 读取 lib/index.js，必须先 build
```

`scripts/build-client.mjs` 使用 dsh 源码 checkout 里的 client 打包预设（`packages/client/tsdown.client.ts`，默认 `..\..\deepseek-harness`，可用 `$DSH_HARNESS` 或参数覆盖）。该预设通过 `packages/<group>/<dir>/package.json` 定位包，所以脚本会在 checkout 内临时放一个"门面包"，把本仓库的 `node_modules` 链进去，按 Client 构建面跑 tsdown，把产物里夹带的 checkout 路径归一化，拷回后删除临时目录——checkout 本身不留改动。本机默认路径找不到时，把 checkout 根目录作为第一个参数传入。

`scripts/bundle-node.mjs` 现在用 esbuild 的 external 模式产出七个入口：
`lib/index.js`、`lib/composer.js`、`lib/settings-skin.js`、`lib/sidebar.js`、
`lib/theme.js`、`lib/desktop-menu.js`、`lib/session-title.js`。`package.json`
的 `exports` 与 `files` 必须和这七个入口保持同步。

每次改完 client 代码都要重跑 client bundle；只跑 `pnpm run build` 只会更新
node 入口，不会更新 `lib/client.js`。

## 验证

当前已完成的验证：

- `pnpm run typecheck` 通过。
- `pnpm run contract-check` 通过：peerDependencies 35 项、源码 104 个文件 26 个包、named imports 135 项、client inject 15 项均无缺失。
- `pnpm run build` 七个 node 入口全部生成。
- `pnpm test` 86/86 通过，覆盖悬停卡、会话归属、folder transition、node 路由与 prompt、分区模型、分区 Host 文件往返。
- `node scripts/build-client.mjs 'E:\AI\Agents\Deepseek Harness\Code'` 生成 `lib/client.js` 1.34 MB、source map 和 `lib/index.js`。
- `npm pack --dry-run` 包含 118 个文件：全部入口、类型声明、图标、`INTEGRATION.md`、`cordis.patch.yml` 以及许可证/归属文件。
- 一次性 profile 启动成功；启用状态下 composer/theme/settings-skin/sidebar/desktop-menu 端点均返回 `enabled:true`；依赖页端点返回 401，说明路由已注册且认证栅栏生效。
- 真实 headless Chrome 已加载 UI：设置双岛与 Workspace Browser 页、主题切换与玻璃开关、分区启用/移动/折叠、PanelNav 手风琴、Composer 新会话建议卡片、输入框宽度手柄、↑ 召回输入历史均实际渲染；控制台无 boot 错误。桌面菜单因当前 Web 环境没有 `[data-windows-menu]`，按设计 no-op。
- 已抽测 composer 子插件停用：端点返回 401、输入框宽度手柄与新会话建议卡均不渲染；其余子插件的停用矩阵与完整 rc.3 宿主组合仍未逐项实测，详见 [INTEGRATION.md](INTEGRATION.md)。

### 历史宿主对照方法

1. **类型面**：`devDependencies` 把每个 `@deepseek-ai/*` 固定到本插件对准的已发布世代（`0.2.2-rc.2`；cordis `^4.1.0`），任何该世代没有的原子、prop 或服务都会让 `pnpm run typecheck` 失败。三个宿主文件夹 API 仍不在已发布类型里，改为本地声明的可选能力——缺失时项目编辑器退回插件自己的 store。client inject 列表还声明了 `@deepseek-ai/dsh-api-remote-access`，rc.2 的 `remoteAccess` 服务来自它。
2. **产物依赖面**：与宿主构建对比——从 `resources/app.asar` 取出宿主自带的 `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js`，比较两者的 `//#region lib/types/...` 模块清单、以及每个模块表条目被用到的成员集合（`_deepseek_ai_dsh_client_ui_primitives.X`、`_deepseek_ai_dsh_client_store.X`、`_deepseek_ai_dsh_cordis.X`、`react.X`、`react_jsx_runtime.X`），并把用到的 primitives 符号逐个对照宿主那条 `export { … }` 清单。「多出来的模块」（项目编辑器）与「多出来的成员」只有在宿主确实导出它们时才算安全。
3. **运行期**：用宿主自带的运行时 + 一次性 profile 装上本插件启动，再用无头浏览器加载其界面，断言新增功能确实渲染：树内插件没有的 `最近会话 / Recents` 分区、工作区行菜单里出现 *编辑项目*、项目编辑器对话框里有 *源文件夹* 与 *添加文件夹*、并且控制台无错误。

## 已知缺口

- **「设为主要」不改宿主注册表里的路径。** 出厂宿主没有这个 API。插件记住提升后的目录，新建会话落在那里，并按 cwd 借回工作区；宿主仍把原路径当作工作区路径。宿主带文件夹 API 时改走宿主，路径会真正换掉。
- **有歧义的文件夹不点名。** 两个工作区可以列出同一个目录；在那里新建的会话不属于其中任何一个，prompt 保持沉默而不是猜（宿主的额外根解析同样会放弃）。
- **`workspace-write` 下额外文件夹可读不可写**：沙箱根仍只有一个，且写目标要 realpath 后落在根内，所以在工作区里做 junction/软链指向外部目录也会被拒。
- **文件夹归属按会话 `cwd` 匹配**，且只"借用"宿主留作未分组的会话；宿主已归到某个工作区下的会话不会被搬走。
- `src/` 是 0.2.1-rc.2 树内 `ui-workspace` 快照加上插件层（最近会话、项目编辑器、文件夹持久化）。换宿主世代时重新取用共享文件，并保留能力探测。
- 包内测试覆盖悬停卡片的文件夹事实、会话到工作区的归属与那句话（`tests/session-folders.test.mjs`）、node 半边（路由 + prompt 上下文，`tests/node-half.test.mjs`）、分区模型与 folder layer 往返（`tests/sections.test.mjs`）。
- 参考插件的 DOM 接管层没有迁入：面板导航是当前树内的简化实现，默认关闭；工作区分区也走当前 store/tree，不接管官方 `sectionHeader`。完整对照项与限制见 [INTEGRATION.md](INTEGRATION.md)。

## 许可证

本包整体以 MIT 许可证发布（见 `LICENSE`）。其中从 `@michengai/dsh-codex-ui` 2.2.5 改编的部分仍按 Apache License 2.0 授权，完整许可文本见 `LICENSE-APACHE`，归属与改编范围见 `THIRD_PARTY_NOTICES.md`。
