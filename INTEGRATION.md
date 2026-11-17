# 工作区 UI 集成说明与执行计划

本文记录把 `@michengai/dsh-codex-ui` 2.2.5 并入
`@lihongxu0221/dsh-workspace-ui` 的完整对照、冲突处理、
实施顺序、验证结果与已知限制。当前仓库已经按本文第 0 至第 3 批完成实现，
后续维护可以按同一顺序重放。

## 0. 基线与约束

参考仓库：https://github.com/MichengAI/dsh-codex-ui，审计时 main 为
`828a096`，版本 2.2.5。

当前仓库：`@lihongxu0221/dsh-workspace-ui` 0.8.0，
工作区为 `E:\AI\Agents\Deepseek Harness\DSH\dsh-workspace-ui`。

硬约束：

- 当前插件继续作为唯一 `ctx.uiWorkspace` 提供者，并继续独占
  `sidebar.workspaces`。参考仓库的 `@deepseek-ai/dsh-client-ui-workspace`
  运行时依赖全部移除，不能把官方 `ui-workspace` 重新启用。
- 当前工作区浏览、Recents、搜索、视图选项、会话行操作、项目编辑器、
  源文件夹持久化、目录存在性探测、reroot、快捷键、toast 的行为保持不变。
- 参考实现的 DOM 接管层不直接迁入。参考侧栏会隐藏原生
  `button[class*="newSession"]` 与 `nav[class*="panelList"]`，再插入独立
  React 根；参考分区层还依赖官方 `data-row-key="workspace:*"`、
  `sectionHeader`、`headerActions` 结构。这两点在当前插件里都会和现有
  React 树抢同一块区域，因此改为在当前树内实现。
- 两边实现冲突时默认保留当前插件行为。需要改变默认视觉或交互的地方，
  在本文第 6 节单独列出。
- 新增的宿主能力全部按可选服务探测；当前 node 入口仍然只强制
  `connection`，参考子插件各自声明自己的宿主服务。

## 1. 当前插件功能清单（C1 至 C16）

C1 工作区浏览主区。入口 `src/client/index.ts` 注册
`sidebar.workspaces`；实现 `src/client/rows/WorkspaceUI.tsx`、
`src/client/rows/Rows.tsx`、`src/client/rows/AnimatedRows.tsx`。对外行为：
按工作区分组或平铺显示会话，支持折叠、搜索命中定位、会话水位线、
悬停卡、行菜单、行按钮。

C2 Recents 分区。入口在 `WorkspaceUI.tsx`，状态键 `recentsOpen`。
对外行为：默认展示最近 5 个会话，可折叠，可展开其余会话；与 Workspaces
分区并列。

C3 会话搜索。入口 `WorkspaceUI.tsx` 的搜索框和
`ctx.sessions.search`。对外行为：250ms 防抖、最多 500 个 UTF-16 单元、
结果可点击打开、关闭后恢复树。

C4 视图选项。入口 `ViewOptionsMenu`。对外行为：分组方式
`workspace`、`workspace-tree`、`flat`；排序 `manual`、`updated`；归档筛选
`hide`、`show`、`only`。

C5 会话行操作。入口 `src/client/index.ts` 的
`sidebar.workspaces.session.menu.item` 与
`sidebar.workspaces.session.row.action`。实现
`src/client/session-actions/`。对外行为：置顶、取消置顶、重命名、派生、
归档、取消归档、复制会话 ID；归档确认会列出运行中的活动。

C6 项目编辑器。入口 `src/client/WorkspaceEditDialog.tsx`。对外行为：
编辑工作区标题、主文件夹、额外源文件夹；逐项打开文件夹、设为主要、
删除；添加文件夹只在目录选择流可用时出现；保存时提交标题、主文件夹和
文件夹差异。

C7 添加工作区与目录选择。入口 `src/client/WorkspacePicker.tsx` 和
`sidebar.workspaces.directoryFlow`。对外行为：桌面窗口优先用
`window.__DSH_DIRECTORY_PICKER__`，远程浏览器用应用内目录选择器；
选中后创建或打开工作区。

C8 源文件夹与主要文件夹。入口 `src/client/folder-sync.ts`、
`src/client/stores.ts`、`src/folder-layer.ts`、`src/index.ts`。对外行为：
宿主没有文件夹 API 时，把额外文件夹写入
`dsh.workspace.view.v5` 与 `.dsh/storages/workspace-ui-folders.json`；
node 半边注册 `workspace-ui:folders` prompt 上下文；设为主要时把
宿主 Workspace 记录移动到规范化路径。

C9 目录存在性与 reroot。入口 `src/index.ts` 的
`GET /api/workspace-ui/directory` 与
`POST /api/workspace-ui/reroot`。对外行为：打开会话前探测原目录；
目录已删除时把会话工作目录移到有效主文件夹；失败返回可读原因，不抛异常。

C10 快捷键。入口 `src/client/shortcuts.ts`。对外行为：新建会话、搜索、
添加工作区、重命名、派生；快捷键按平台与宿主能力调整，目录流不可用时
添加工作区会被阻塞并给出原因。

C11 toast 与确认层。入口 `src/client/toast/` 和 `shell.overlay`。对外
行为：行操作结果、归档确认、重命名对话框在 frame 级覆盖层显示。

C12 `UiWorkspace` 服务。入口 `src/client/navigation.ts`。对外行为：
`startSession`、`openSession`、`openWorkspace`、`forkSession`、
`connectWorkspace`、`archiveSession`、`unarchiveSession`、`pinSession`、
`unpinSession`、`pickDirectory`、`listDirectory`、`createDirectory`。

C13 插槽。入口 `src/client/index.ts`。除 `sidebar.workspaces` 外，声明
`sidebar.workspaces.directoryFlow`、`sidebar.workspaces.session.menu.item`、
`sidebar.workspaces.session.row.action`、`sidebar.session.row.leading`、
`sidebar.session.row.hover`、`conversation.hero.workspace` 及其
`directoryFlow`。

C14 中英双语。入口 `src/client/locales.ts`，命名空间 `workspace`。

C15 构建与测试。`tsc`、`node --test`、`esbuild` 多入口 node bundle、
client 预设单 bundle。

C16 产品分析与宿主能力探测。入口 `src/client/index.ts` 与
`host-capabilities.d.ts`。对外行为：`branch_session_click` 等事件；
文件夹 API、目录选择器、远程访问能力按存在性启用。

## 2. 参考仓库功能清单（R1 至 R19）

R1 输入增强。模块 `src/composer-plugin.ts`、`src/composer-prediction.ts`、
`src/client/composer/`。功能：行内意图预测、续写、SSE 流、Tab 接受、
Alt+Up/Down 切换候选、Esc 退出、三段模式、模型与推理强度设置、
预测设置卡片。依赖宿主 `webServer`、`llm`。

R2 输入历史。模块 `src/client/composer/InputHistoryDock.tsx`、
`input-history.ts`、`input-history-keyboard.ts`、`history-scope.ts`。功能：
空输入框按 Up/Down 召回；作用域为当前会话或同 cwd 工作区；每作用域
最多 200 条，最多 100 个作用域。

R3 输入框宽度拖拽。模块 `composer-width.ts`。功能：640 起拖拽，
写入 `dsh.conversation.contentWidth`。

R4 新会话建议卡片。模块 `NewConversationSuggestions.tsx`。功能：在空
会话输入区展示任务建议，点击填入草稿。

R5 Composer 设置卡片。模块 `ComposerSettingsCard.tsx`。功能：预测开关、
模型、推理强度、输入历史作用域。

R6 原生设置皮肤。模块 `src/client/settings-skin/`。功能：全屏双岛设置
工作台、导航分类、原生输入框搜索、Ambient Ground、返回按钮。依赖官方
设置弹层 DOM 与主题玻璃变量。

R7 主题与玻璃。模块 `src/client/theme/`。功能：14 套主题、三档玻璃、
compat/mica 排版、地面光斑、设计 Token 注入、停用清理与自愈。

R8 模块化侧栏。模块 `src/client/sidebar/SidebarNav.tsx`、`layout.ts`。
功能：面板导航、常驻/更多手风琴、拖拽排序、plugins 固定、折叠导轨对齐、
新会话入口。参考实现用独立 React 根并隐藏原生节点。

R9 工作区分区。模块 `src/client/sections/`、`src/folder-layer.ts`。
功能：置顶/项目/自定义分区、分区改名与排序、工作区归属、跨区拖拽、
从分区标题添加工作区并自动归位。置顶固定最上；项目与自定义分区都能
通过标题菜单上移/下移，自定义分区还支持标题拖拽排序。

R10 会话未读。模块 `src/client/sidebar/session-unread/`。功能：右键标记
未读/已读；新宿主走原生 contextMenus，老宿主走槽位与右键兜底。

R11 智能标题。模块 `src/session-title*.ts`。功能：首条消息生成标题，
跳过 automation、IM、subagent、fork；接管官方首条消息标题提供方，
失败回退。

R12 桌面菜单。模块 `src/client/desktop-menu/`、`src/desktop-menu-route.ts`、
`src/restart.ts`。功能：Electron 标题栏帮助菜单、刷新页面、重启应用与
Host、一次性令牌、状态轮询。

R13 生态依赖管理。模块 `src/dependency-manager.ts`、
`src/dependencies-route.ts`、`src/npm-downloads.ts`、
`src/client/AboutSection.tsx`。功能：生态插件安装状态、版本、npm 下载量、
单个升级、一键全部更新、进度显示。

R14 移动端布局。模块 `src/client/mobile-web.ts`。功能：窄屏撑满视口、
安全区、44px 触控、16px 输入、短视口压缩、浮层夹入 visualViewport。

R15 八语言。模块 `src/client/workspace-ui-locales.ts`、`src/client/locales/*.ts`。
功能：中、英、日、西、法、德、俄、葡。

R16 设置分区与图标。模块 `src/client/index.ts`、
`src/client/AboutSection.tsx`、`settings-nav-icon.ts`。功能：设置里新增
Workspace UI 分区与图标。

R17 子插件状态端点。模块 `src/*-plugin.ts`。功能：每个子插件独立
`enabled` 探测，客户端 fail-closed 或 fail-open 按功能选择。

R18 多入口与补丁。模块 `package.json`、`cordis.patch.yml`。功能：
六个 node 子插件入口独立加载与独立停用。

R19 品牌图标。模块 `assets/icon.svg`。功能：包图标与子插件图标。

## 3. 四类比对结果

### 3.1 当前已有，参考实现视为重复

- R1 的新会话入口：当前已有 `UiWorkspace.startSession` 与新会话按钮。
  参考的 composer 只保留预测、续写、历史、宽度、建议、设置卡片，不
  再新建第二套新会话按钮。
- R3 的输入框折叠/展开：当前布局已经处理会话区宽度，参考的折叠导轨
  不重复实现。
- R5 的添加工作区：当前已有 `WorkspacePicker` 与目录流，参考侧栏的
  “克隆宿主按钮”实现不迁入。
- R9 的置顶语义：当前 `pinnedWorkspaceIds` 已是唯一置顶来源，参考的
  独立置顶状态不复制。
- 会话右键槽：当前已有 pin/rename/fork/archive/session-id；参考只新增
  未读项，不替换现有项。
- 折叠导轨：当前侧栏已有窄态行为，参考的 56px 对齐不单独接管。

### 3.2 参考有、当前缺失，已集成

R1 预测与续写、R2 输入历史、R3 宽度拖拽、R4 新会话建议、R5 Composer
设置卡片、R6 设置皮肤、R7 主题与玻璃、R10 会话未读、R12 桌面菜单、
R13 生态依赖管理、R14 移动端布局、R15 八语言、R16 设置分区与图标、
R17 子插件状态端点、R18 多入口、R19 图标，以及 R9 的自定义分区。

R8 面板导航和 R11 智能标题按“冲突项”处理，见 3.3。

### 3.3 两边实现冲突及处理

冲突一：官方 `ui-workspace` 依赖。

参考 client 入口注入 `uiWorkspace` 并导入
`@deepseek-ai/dsh-client-ui-workspace/client` 类型；参考 sidebar 还假设
官方工作区 DOM 存在。当前插件停用官方 `ui-workspace` 并自己提供
`ctx.uiWorkspace`。处理：保留当前替换关系；参考代码中所有
`uiWorkspace` 调用改走当前 `UiWorkspaceService`；类型导入和运行时
官方包依赖删除。当前 `cordis.patch.yml` 继续保留
`ui-workspace: disabled`。

冲突二：侧栏 DOM 接管。

参考 `SidebarNav` 会找原生 `button[class*="newSession"]`，隐藏
`nav[class*="panelList"]`，插入独立根。当前 `sidebar.workspaces` 已经
渲染整块工作区区域，二者会抢同一视觉位置。处理：挂载参考
`observeSidebarNav`，由它隐藏原生 `newSession`/`panelList` 并插入
独立导航；`SidebarNav` 已包含固定新会话、`plugins` 常驻、常驻/更多
手风琴、拖拽排序和折叠态 56px 原生导轨。`PanelNav.tsx` 保留为可选的
紧凑面板导航，默认关闭；完整侧栏激活时用 CSS 隐藏它，避免双入口。

冲突三：工作区分区。

参考分区层依赖 `data-row-key`、`sectionHeader`、`headerActions` 和官方
`workspaces.insertBefore`；当前这些行在自己的 React 树里，参考选择器
会误判或静默失效。处理：不迁参考 DOM 层；把 `sections/model.ts` 与
`order.ts` 复制为纯模型；在当前 `SessionTree` 内生成分区标题与成员；
分区数据并入 `dsh.workspace.view.v5`，再通过现有 folder layer 写入
`.dsh`；置顶成员继续由 `pinnedWorkspaceIds` 派生；没有
`insertBefore` 时用当前本地排序。

冲突四：分区“添加工作区并自动归位”。

参考通过克隆原生添加按钮或派发 Ctrl/Cmd+O，再等待新工作区出现。
当前已有 `requestAddWorkspace()` 和 `WorkspacePickFlow`。处理：分区
标题的添加按钮复用当前目录流；`pendingSectionId` 记录目标分区，
`WorkspacePickFlow.onPick` 成功后先分配分区，再关闭选择器并开始会话；
取消或关闭选择器时清空 pending。

冲突五：智能标题的官方提供方接管。

参考会临时停用官方 `session-title-llm` 或
`optional-session-title-all-prompts`，再注册自己的提供方；失败恢复。
处理：保留该生命周期，但 provider id、日志前缀、插件来源改为
`workspace-ui-*`；只在官方恰好单条启用时接管，多条或不存在时
跳过；失败 throw 让宿主保留默认标题。

冲突六：主题全局 Token。

参考直接写 `document.body` 的 190 个 `--dsw-*` Token 和
`data-dsh-glass-*` 属性。当前没有主题体系，但有自己的 CSS Modules。
处理：主题模块独立挂载，默认主题 `stock`、玻璃默认关闭；只有用户
在设置里显式选择主题或开启玻璃时才写全局 Token；停用或端点失败时
清理 Token 与属性并回退官方主题。

冲突七：设置皮肤依赖官方设置 DOM。

参考依赖 `[data-shortcut-modal="settings"]`、
`[data-slot="settings.header"]`、`div[class*="sidebarCol"]`。当前没有
自己的设置壳。处理：保留参考实现，但只在官方设置弹层存在且玻璃
开启时增强；宽度探测失败回退 280；默认不改变官方设置的功能与快捷键。

冲突八：输入框宽度共享键。

参考写 `dsh.conversation.contentWidth`，与宿主共享。处理：保留共享键，
最小值 640，避免出现第二条宽度状态；如果宿主没有该键，首次写入前
先读当前值。

冲突九：会话未读与现有菜单槽。

参考注册 `sidebar.workspaces.session.menu.item`，id
`workspace-ui:session-unread`，order 150。当前同一槽已有 pin 100、
rename 200、fork 300、archive 400、session-id 450。处理：保留当前
五项，未读作为 order 150 的独立项插入；id 改为
`workspace-ui:session-unread`，避免和参考插件同时安装时冲突。

冲突十：单入口构建。

当前 `scripts/bundle-node.mjs` 只支持一个 node 入口。参考有六个
子插件入口。处理：改为 esbuild 多入口，输出
`lib/index.js`、`lib/composer.js`、`lib/settings-skin.js`、
`lib/sidebar.js`、`lib/theme.js`、`lib/desktop-menu.js`、
`lib/session-title.js`；`package.json` 的 exports 与 files 同步。

冲突十一：根上下文必需服务。

参考根入口强制注入 `webServer`、`profileContext`、`pluginManager`；
当前根入口只强制 `connection`。处理：根入口仍然只强制 `connection`；
依赖页路由只在检测到 `pluginManager` 时注册，缺少该服务时整个
依赖页降级，不影响工作区浏览；其余子插件各自声明宿主服务。

冲突十二：Composer 槽位顺序。

参考在 `conversation.input.dock` 同时注册三个 order -100 的条目，
顺序不稳定。处理：新会话建议保留 -100；输入历史与提示拆分为独立
order 0 与 1（实现上保留参考 id，但不再和 -100 抢同一序位）。

冲突十三：移动端 DOM 钩子。

参考依赖官方 `data-composer-input`、`data-sidebar-scrollport` 等。
当前工作区浏览的 DOM 类名不同。处理：移动端样式对两类钩子都做
兼容选择；只改布局，不接管交互；检测到桌面标题栏时不启用。

### 3.4 重复实现

以下能力两边都有，保留当前实现，参考只作为行为参考，不复制第二套：

- 新建会话按钮与 `startSession`。
- 添加工作区按钮与目录选择。
- 工作区置顶/取消置顶。
- 工作区分组与折叠。
- 会话右键菜单的 pin/rename/fork/archive/ID。
- 窄侧栏折叠行为。
- 输入框历史与宿主输入框的键盘事件。
- 折叠分区的展开状态。

## 4. 逐项集成方案与改动文件

### 第 0 批：基线、依赖、构建

改动：

- `src/client/rows/WorkspaceUI.tsx`：补本地 `useSectionScroller`，
  保留 `bindScrollerRef` 形状。
- `src/client/WorkspacePicker.tsx`：移除 Menu 不接受的 `anchorRef` 传参，
  保留可选接口字段。
- `src/client/tree.ts`：用本地结构类型替代未安装的
  `SessionStatusSnapshot`。
- `package.json`：补 `ui-settings`、`ui-settings-general`、`ui-theme`、
  `ui-input-trigger`、`ui-context-menu`、`webServer`、`plugin-manager`、
  `session-title`、`llm`、`app-boot`、`react-dom`、`lucide-react`；
  新增六个子路径 exports 与 files；`dsh.client.inject` 扩到 17 项。
- `tsconfig.json`：`types: ["node"]`；为参考源码关闭
  `exactOptionalPropertyTypes` 与 `noUncheckedIndexedAccess`，只放宽
  类型检查，不改运行行为。
- `scripts/bundle-node.mjs`：改 esbuild 多入口。
- `cordis.patch.yml`：保留 `ui-workspace` 禁用与根插件插入，新增六个
  子插件行。
- 新增 `assets/icon.svg` 与图标 exports。

风险：新增依赖会抬高安装面；子插件入口必须与 exports 完全一致，否则
宿主会在启动时找不到入口。验证：`npm run typecheck`、
`npm run contract-check`、`npm run build`。

### 第 1 批：无冲突新增功能

1. 语言与设置壳。`src/client/workspace-ui-locales.ts`、
   `src/client/locales/{ja,es,fr,de,ru,pt}.ts`、
   `src/client/AboutSection.tsx`、`src/client/index.ts`。新增
   `settings.section` 与 `settings.section.icon`。
2. Composer。`src/composer-plugin.ts`、`src/composer-prediction.ts`、
   `src/composer-models.ts`、`src/client/composer/`。Host 端点挂在
   `/api/workspace-ui/extensions/composer`；客户端注册
   `conversation.input.dock` 与 `conversation.input.overlay`。
3. 主题。`src/theme-plugin.ts`、`src/client/theme/`。注册 14 套主题；
   Token 与玻璃属性写入 body；端点 `/theme`。
4. 设置皮肤。`src/settings-skin-plugin.ts`、
   `src/client/settings-skin/`。只在官方设置弹层存在时增强。
5. 智能标题。`src/session-title-plugin.ts`、
   `src/session-title-provider.ts`、`src/session-title-lifecycle.ts`、
   `src/session-title.ts`。独立入口，失败回退。
6. 桌面菜单。`src/desktop-menu-plugin.ts`、
   `src/desktop-menu-route.ts`、`src/restart.ts`、
   `src/client/desktop-menu/`。只对 Electron 标题栏生效。
7. 移动端。`src/client/mobile-web.ts`。只对窄屏/粗指针生效。
8. 生态依赖页。`src/dependency-manager.ts`、`src/dependencies.ts`、
   `src/dependencies-route.ts`、`src/npm-downloads.ts`、
   `src/profile-resolver.ts`、`src/client/AboutSection.tsx`。只经宿主
   `pluginManager` 安装；从受管清单移除参考 UI 自身。
9. 会话未读。`src/client/sidebar/session-unread/`。注册独立菜单项。

风险：Composer 预测的 SSE 与键盘事件可能和宿主输入框竞争；主题 Token
可能污染官方界面；设置皮肤依赖官方 DOM 类名。验证：各端点 enabled
返回、客户端失败时不白屏、停用后无残留 DOM/Token。

### 第 2 批：分区、面板导航、持久化

1. 分区模型。`src/client/sections/model.ts`、`order.ts`。
2. 状态与动作。`src/client/stores.ts`：新增 `sectionsEnabled`、
   `sections`、`sectionExpansion`、`panelNavEnabled`、`panelOrder`、
   `panelPinned`。
3. 分区 UI。`src/client/rows/WorkspaceUI.tsx`：分区标题、折叠、
   新建、重命名、删除、上移/下移、成员菜单、跨区拖拽、分区内添加
   工作区。
4. Host 持久化。`src/folder-layer.ts`、`src/client/folder-sync.ts`：
   复用 `/api/workspace-ui/folders` 与
   `.dsh/storages/workspace-ui-folders.json`。
5. 面板导航。`src/client/sidebar/index.ts` 的 `observeSidebarNav` 已在
   `src/client/index.ts` 挂载：固定新会话、`plugins` 常驻、常驻/更多、
   拖拽、折叠态 56px 原生导轨随子插件探活启用。`PanelNav.tsx` 保留为
   可选紧凑模式，默认关闭，完整侧栏激活时自动隐藏。
6. 冲突清理。完整侧栏与当前 `sidebar.workspaces` 共存，只隐藏原生
   新会话/面板列表，不动工作区树；主题/设置/composer 的 id 与日志前缀
   改为本插件前缀。

风险：分区是显式模式，默认关闭，避免改变现有用户路径；启用后强制
`groupBy='workspace'`。验证：`tests/sections.test.mjs`、
`tests/sidebar.test.mjs`、手工切换分区/侧栏展开收起、折叠分区、跨区拖拽、
重启后 Host 文件回填。

### 第 3 批：回归与交付

1. `npm run typecheck`。
2. `npm run contract-check`。
3. `npm run build`，再跑 `npm test`（测试读取 `lib/index.js`，必须先
   build）。
4. `node scripts/build-client.mjs 'E:\AI\Agents\Deepseek Harness\Code'`。
5. `npm pack --dry-run`。
6. 用一次性 profile 启动 Host，探测扩展端点与既有路由。
7. 更新 README、本文与最终交付说明。

## 5. 默认开关与行为改动

以下改动是集成参考实现时必须显式说明的：

- 分区模式默认关闭。原因：现有分组、Recents、拖拽、水位线是当前
  用户的主路径；开启后强制工作区分组，避免树形嵌套与分区语义冲突。
- 完整侧栏默认随 `workspace-ui-sidebar` 子插件启用；它只隐藏原生
  新会话/面板列表，不隐藏当前 `sidebar.workspaces` 工作区树。可选的
  `PanelNav` 默认关闭，完整侧栏激活时自动隐藏，避免双面板入口。
- 主题默认 `stock`，玻璃默认关闭。原因：升级后保持当前视觉；用户
  在 Workspace UI 设置里显式选择主题或开启玻璃后才写全局 Token。
- 设置皮肤默认启用但只在玻璃开启且官方设置弹层存在时生效，失败
  fail-closed，不影响官方设置功能。
- Composer 默认启用；端点失败时静默回退原生输入框。输入历史只在
  空输入框抢 Up/Down，不改变非空输入的键盘行为。
- 智能标题默认随子插件启用；只在官方恰好一条首条消息标题提供方时
  接管，失败或歧义时保留宿主默认标题。
- 桌面菜单只在 Electron 标题栏 DOM 存在时注入；Web 下完全无操作。
- 依赖页只展示受管白名单，安装与升级只经宿主 `pluginManager`，不从
  浏览器直接执行 npm。
- 移动端样式只在窄屏或粗指针且没有桌面标题栏时启用。

## 6. 验证结果

已经完成的验证：

- `npm run typecheck`：通过。
- `npm run contract-check`：通过。peerDependencies 35 项、源码 105 个
  文件 26 个包、named imports 135 项、client inject 15 项均无缺失。
- `npm run build`：七个 node 入口全部生成。
- `npm test`：93/93 通过。覆盖悬停卡、会话归属、folder transition、
  node 路由与 prompt、分区模型、分区 host 文件往返、侧栏折叠信号。
- `node scripts/build-client.mjs 'E:\AI\Agents\Deepseek Harness\Code'`：
  生成 `lib/client.js` 1.38 MB、source map 和 `lib/index.js`。
- `npm pack --dry-run`：121 个文件，包含全部入口、类型声明、图标、
  `INTEGRATION.md` 与 `cordis.patch.yml`。
- 一次性 profile `wb-check` 启动成功；启用状态下
  `/api/workspace-ui/extensions/composer` 返回
  `{"enabled":true,"prediction":true}`，`/theme`、`/settings-skin`、
  `/sidebar`、`/desktop-menu` 返回 `{"enabled":true}`。
  `/api/workspace-ui/extensions/dependencies` 返回 401，说明路由
  已经注册且认证栅栏生效；旧 `/folders` 同样返回 401，属于
  `connection.fetch` 的认证路径。
- 没有修改用户的 `desktop` profile；探针服务已停止，没有残留端口。

真实 UI 验证（headless Chrome + CDP，一次性 profile）：

- 应用启动无 boot 失败，侧栏、Recents、工作区树、会话行操作与 Composer
  正常渲染。
- 设置工作台：Workspace UI 导航项、双岛布局、分类导航、原生搜索
  均生效。
- About/生态页：项目链接、反馈链接、六个子插件说明、主题卡、Composer
  卡、依赖列表（状态/下载量/单项安装/全部更新）均渲染。
- 主题：Codex 暗色全局生效，官方默认可恢复；玻璃开关默认关闭且可开/关。
- 分区：视图菜单可启用；置顶/项目计数随工作区移动变化；折叠、分区内
  添加工作区、新建分区按钮均渲染；默认“项目”与自定义分区都能通过标题
  菜单上移/下移；自定义分区标题可拖拽排序；普通空分区不渲染，默认
  “项目”分区即使为空也常驻显示；没有目录流时不显示分区标题的
  “添加工作区”按钮。
- PanelNav：启用后显示“会话 / 更多面板”手风琴，关闭后恢复；不隐藏
  原生侧栏 DOM。
- Composer：新会话建议卡片渲染；输入框左右宽度手柄渲染；输入后 ↑ 可
  召回本会话历史；注册表内四个 dock 条目与预测 overlay 均存在。
- 桌面菜单：Web 环境没有 `[data-windows-menu]`，按设计 no-op。

未完成或无法在当前环境完成的验证：

- 已抽测 composer 子插件停用：其端点返回 401，界面上的宽度手柄与新会话
  建议卡都不渲染，证明客户端 fail-closed 生效。其余子插件没有逐项跑完；
  webServer 路由未注册时宿主统一返回 401，因此停用不能只靠 HTTP 状态
  判断，仍需逐项观察 DOM 残留。
- rc.2 与 rc.3 的完整组合矩阵没有跑完；当前类型与运行探针基于
  0.2.2-rc.2，参考源码审计基于 rc.3。

## 7. 已知限制

- 分区不是参考的独立 DOM 分区层。它不会接管官方 `sectionHeader`，
  也不会在没有 `workspaces.insertBefore` 的宿主上调用宿主排序；没有
  该 API 时只做本地排序。
- 完整侧栏替换依赖官方 `button[class*="newSession"]` 和
  `nav[class*="panelList"]` 钩子；缺少原生新会话按钮时会退回
  `panelList` / 官方侧栏槽位继续挂载。宿主改类名时会静默不挂载并回退
  官方侧栏。折叠态仍使用宿主原生 56px 导轨，不自定义折叠布局；插件用
  `data-wui-sidebar-collapsed` 标记跟随宿主的 `collapsed` 类或
  `data-sidebar-collapsed` 属性，避免两套导航同时显示。
- 主题的玻璃 CSS 仍引用部分官方 `sidebarCol`、`data-phase` 等钩子。
  如果未来宿主重命名这些类名，玻璃会降级但不报错。
- 设置皮肤依赖官方设置弹层的 DOM；如果官方设置结构变化，增强会
  静默不生效，官方设置本身仍然可用。
- 智能标题的生命周期依赖宿主 `sessionTitle`、`llm`、`loader` 三个
  服务；服务缺失时只记录警告，不注册。
- 生态依赖页需要宿主 `pluginManager`；缺少时整个页面降级，不显示
  安装按钮。
- 桌面菜单的重启能力只对 Electron 桌面宿主有效；Web 下没有菜单。
- 输入历史的存储键仍保留参考实现的 `workspace-ui.*` 前缀。当前插件与
  参考插件不应同时启用；如果未来要并行安装，需要统一改前缀并迁移
  旧数据。
- 当前 `src/client/sidebar/` 已是运行时挂载的完整侧栏实现；
  `PanelNav.tsx` 仅作为可选紧凑模式保留。R9 分区仍走当前 store/tree，
  标题拖拽排序、普通空分区隐藏、默认“项目”空分区常驻、无目录流时隐藏
  添加按钮，以及默认“项目”分区与自定义分区的菜单上移/下移均已接入；
  置顶分区固定最上，不参与排序。

## 8. 后续维护顺序

1. 先改 `src/client/index.ts` 的挂载点，再改具体 observer。
2. 改 Host 端点时同时改 `src/business-api.ts`、`src/*-plugin.ts` 和
   客户端 `check*Enabled`。
3. 改主题/设置皮肤时先确认官方 DOM 钩子仍存在；不存在就降级，
   不要强行查询。
4. 改分区/面板时先跑 `tests/sections.test.mjs`，再手工验证默认关闭
   路径没有变化。
5. 每次改 client 后必须重跑 client bundle；`npm test` 前必须
   `npm run build`，因为 node 测试读取 `lib/index.js`。

## 9. 许可证与归属

本包整体以 MIT 发布；从 `@michengai/dsh-codex-ui` 2.2.5 改编的部分仍按
Apache License 2.0 授权。`LICENSE-APACHE` 保存完整许可文本，
`THIRD_PARTY_NOTICES.md` 记录上游归属、改编范围和 `lucide-react` 的
ISC 许可。两份文件都包含在发布包中。
