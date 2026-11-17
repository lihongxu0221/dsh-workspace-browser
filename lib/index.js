import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import process$1 from "node:process";
//#region lib/types/client/sections/model.js
/**
* 工作区「分区」模型（纯函数，不触碰 DOM 与存储）。
*
* 分区是插件层的视图结构：宿主的工作区注册表仍是唯一事实来源，
* 分区只决定「谁排在谁旁边」。因此模型里的分组成员顺序就是最终要写入宿主的顺序，
* `flattenSections` 的结果与宿主 `workspaces` 的排列应当逐项一致。
*
* 不变式：
* - 始终包含内置分区 `pinned`（置顶）与兜底分区 `default`（项目），且各只有一份；
* - `default` 永远排在最后，`pinned` 可被拖到任意位置（Codex 同样允许）；
* - 一个工作区最多出现在一个分区里，未知工作区在归一化时被丢弃。
*/
/** 内置「置顶」分区 id：可拖动、可重命名，但不能删除。 */
const PINNED_SECTION_ID = "pinned";
/** 兜底「项目」分区 id：固定最后，成员是尚未归类的工作区。 */
const DEFAULT_SECTION_ID = "default";
/**
* 用当前实际存在的工作区集合校正分区结构：
* - 丢弃已删除的工作区、跨分区重复项（保留首次出现）与重复分区 id；
* - 补齐缺失的内置分区，`default` 固定到最后；
* - 名称空白的内置分区回退默认名。
*
* @param state - 待校正的结构。
* @param knownIds - 宿主当前存在的工作区 id；省略时只做结构校正，不按存在性裁剪（启动早期宿主可能还没就绪）。
* @returns 新的、满足不变式的结构。
*/
function normalizeSections(state, knownIds) {
	const known = knownIds === void 0 ? void 0 : new Set(knownIds);
	const seenIds = /* @__PURE__ */ new Set();
	const seenSections = /* @__PURE__ */ new Set();
	const sections = [];
	for (const section of state.sections) {
		if (seenSections.has(section.id)) continue;
		seenSections.add(section.id);
		const ids = [];
		for (const id of section.ids) {
			if (seenIds.has(id)) continue;
			if (known !== void 0 && !known.has(id)) continue;
			seenIds.add(id);
			ids.push(id);
		}
		const canonical = defaultNameFor(section.id);
		const name = canonical !== "" ? canonical : section.name.trim();
		sections.push({
			id: section.id,
			name,
			ids
		});
	}
	if (!seenSections.has("pinned")) sections.unshift({
		id: PINNED_SECTION_ID,
		name: defaultNameFor(PINNED_SECTION_ID),
		ids: []
	});
	const defaultIndex = sections.findIndex((section) => section.id === DEFAULT_SECTION_ID);
	if (defaultIndex === -1) sections.push({
		id: DEFAULT_SECTION_ID,
		name: defaultNameFor(DEFAULT_SECTION_ID),
		ids: []
	});
	else if (defaultIndex !== sections.length - 1) {
		const [fallback] = sections.splice(defaultIndex, 1);
		sections.push(fallback);
	}
	return { sections };
}
/** 内置分区的默认名称。 */
function defaultNameFor(id) {
	if (id === "pinned") return "置顶";
	if (id === "default") return "项目";
	return "";
}
//#endregion
//#region lib/types/folder-layer.js
/** Folder list that travels with a copied `.dsh` home, not with browser localStorage. */
/** Empty layer. */
function emptyFolderLayer() {
	return {
		extraFoldersByWorkspace: {},
		primaryByWorkspace: {}
	};
}
function isStringList(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string" && item !== "");
}
function stringListMap(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
	const out = {};
	for (const [key, folders] of Object.entries(value)) {
		if (key === "" || !isStringList(folders)) continue;
		out[key] = [...folders];
	}
	return out;
}
function stringMap(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
	const out = {};
	for (const [key, path] of Object.entries(value)) {
		if (key === "" || typeof path !== "string" || path === "") continue;
		out[key] = path;
	}
	return out;
}
function parseSectionsField(value) {
	if (typeof value !== "object" || value === null) return void 0;
	try {
		return normalizeSections(value);
	} catch {
		return;
	}
}
/** Read one persisted layer. Malformed input becomes empty rather than throwing. */
function parseFolderLayer(raw) {
	try {
		const value = JSON.parse(raw);
		if (typeof value !== "object" || value === null) return emptyFolderLayer();
		const record = value;
		const sections = parseSectionsField(record.sections);
		return {
			extraFoldersByWorkspace: stringListMap(record.extraFoldersByWorkspace),
			primaryByWorkspace: stringMap(record.primaryByWorkspace),
			...typeof record.sectionsEnabled === "boolean" ? { sectionsEnabled: record.sectionsEnabled } : {},
			...sections === void 0 ? {} : { sections }
		};
	} catch {
		return emptyFolderLayer();
	}
}
/**
* Normalize a directory for comparison: forward slashes, no trailing slash, and
* a lowercased drive letter (Windows paths are case-insensitive).
* @param path - Raw directory path.
* @returns the comparable form.
*/
function normalizeDirectory(path) {
	const trimmed = path.replace(/[\\/]+$/, "").replace(/\\/g, "/");
	return /^[a-z]:\//i.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}
/** Are two directory paths the same directory? */
function sameDirectory(a, b) {
	return normalizeDirectory(a) === normalizeDirectory(b);
}
//#endregion
//#region lib/types/session-folders.js
/**
* Source folders of the workspace a Session belongs to. The browser half keeps
* the extra-folder layer; this half turns it into the sentence the Session's
* prompt carries, because the shipped host registers neither the folders nor a
* multi-root sandbox for them.
*/
/** Is `child` the directory `parent`, or a descendant of it? */
function containsDirectory(parent, child) {
	const outer = normalizeDirectory(parent);
	const inner = normalizeDirectory(child);
	if (outer === "" || inner === "") return false;
	return inner === outer || inner.startsWith(`${outer}/`);
}
/** The workspace's effective primary: a promoted override wins over the host path. */
function effectivePrimary(layer, workspace) {
	const promoted = layer.primaryByWorkspace[workspace.id];
	return promoted !== void 0 && promoted !== "" ? promoted : workspace.path;
}
/** Every source folder of one workspace, primary first and deduplicated. */
function workspaceSourceFolders(layer, workspace) {
	const out = [effectivePrimary(layer, workspace)];
	for (const folder of [...workspace.folders ?? [], ...layer.extraFoldersByWorkspace[workspace.id] ?? []]) if (!out.some((item) => sameDirectory(item, folder))) out.push(folder);
	return out;
}
/**
* The workspace a Session belongs to: registry membership first, then an exact
* cwd match, then the deepest folder containing the cwd. The last step is what
* finds a Session started in a promoted folder — the host refuses to attach
* such a Session to its workspace, so the registry never lists it.
* @param layer - the plugin's folder layer.
* @param workspaces - workspace records the host registry holds.
* @param session - the Session the prompt is being assembled for.
* @returns the matching workspace, or `undefined` when none owns the Session.
*/
function selectWorkspace(layer, workspaces, session) {
	const id = session.id;
	if (id !== void 0 && id !== "") {
		const member = workspaces.find((workspace) => workspace.sessionIds.includes(id));
		if (member !== void 0) return member;
	}
	const cwd = session.header?.cwd;
	if (cwd === void 0 || cwd === "") return void 0;
	const exact = workspaces.find((workspace) => sameDirectory(effectivePrimary(layer, workspace), cwd) || sameDirectory(workspace.path, cwd));
	if (exact !== void 0) return exact;
	let match;
	let depth = -1;
	let tied = false;
	for (const workspace of workspaces) for (const folder of workspaceSourceFolders(layer, workspace)) {
		if (!containsDirectory(folder, cwd)) continue;
		const length = normalizeDirectory(folder).length;
		if (length > depth) {
			match = workspace;
			depth = length;
			tied = false;
		} else if (length === depth && match !== void 0 && match !== workspace) tied = true;
	}
	return tied ? void 0 : match;
}
/**
* One prompt paragraph naming the workspace's source folders.
* @param layer - the plugin's folder layer.
* @param workspaces - workspace records the host registry holds.
* @param session - the Session the prompt is being assembled for.
* @returns the paragraph, or `''` when the Session has no extra folders.
*/
function sourceFoldersContext(layer, workspaces, session) {
	const workspace = selectWorkspace(layer, workspaces, session);
	if (workspace === void 0) return "";
	const [primary, ...extras] = workspaceSourceFolders(layer, workspace);
	if (primary === void 0 || extras.length === 0) return "";
	const listed = extras.map((folder) => JSON.stringify(folder)).join(", ");
	return `The session workspace ${JSON.stringify(primary)} also includes these source folders: ${listed}. Reads may use all of them; writes stay inside the primary folder unless the file policy above allows more.`;
}
//#endregion
//#region lib/types/business-api.js
const WORKSPACE_UI_API_BASE = "/api/workspace-ui/extensions";
const WORKSPACE_UI_API_ENDPOINTS = Object.freeze({
	dependencies: `${WORKSPACE_UI_API_BASE}/dependencies`,
	settingsSkin: `${WORKSPACE_UI_API_BASE}/settings-skin`,
	composer: `${WORKSPACE_UI_API_BASE}/composer`,
	composerModels: `${WORKSPACE_UI_API_BASE}/composer/models`,
	composerPrediction: `${WORKSPACE_UI_API_BASE}/composer/prediction`,
	composerPredictionStream: `${WORKSPACE_UI_API_BASE}/composer/prediction/stream`,
	sidebar: `${WORKSPACE_UI_API_BASE}/sidebar`,
	sections: `${WORKSPACE_UI_API_BASE}/sections`,
	theme: `${WORKSPACE_UI_API_BASE}/theme`,
	desktopMenu: `${WORKSPACE_UI_API_BASE}/desktop-menu`
});
//#endregion
//#region lib/types/npm-downloads.js
/** 关于页使用的 npm 累计下载量；历史不完整时返回 undefined，不把局部统计当总量。 */
const cache = /* @__PURE__ */ new Map();
const pending = /* @__PURE__ */ new Map();
const QUERY_LIMIT = 4;
let activeQueries = 0;
const queryWaiters = [];
function acquireQuery() {
	if (activeQueries < QUERY_LIMIT) {
		activeQueries += 1;
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		queryWaiters.push(resolve);
	});
}
function releaseQuery() {
	const next = queryWaiters.shift();
	if (next !== void 0) next();
	else activeQueries -= 1;
}
function npmTotalDownloads(packageName) {
	const hit = cache.get(packageName);
	if (hit !== void 0 && hit.expires > Date.now()) return Promise.resolve(hit.value);
	const active = pending.get(packageName);
	if (active !== void 0) return active;
	const request = (async () => {
		await acquireQuery();
		try {
			return await query(packageName);
		} finally {
			releaseQuery();
		}
	})().then((value) => {
		cache.set(packageName, {
			value,
			expires: Date.now() + (value === void 0 ? 5 * 6e4 : 360 * 6e4)
		});
		return value;
	}).finally(() => {
		pending.delete(packageName);
	});
	pending.set(packageName, request);
	return request;
}
async function query(packageName) {
	try {
		const encoded = encodeURIComponent(packageName);
		const metadata = await fetch(`https://registry.npmjs.org/${encoded}`, { signal: AbortSignal.timeout(5e3) });
		if (!metadata.ok) return void 0;
		const created = (await metadata.json())?.time?.created;
		if (typeof created !== "string") return void 0;
		const createdAt = Date.parse(created);
		if (!Number.isFinite(createdAt) || createdAt < Date.parse("2015-01-10T00:00:00Z") || createdAt > Date.now()) return void 0;
		const day = 864e5;
		const start = Math.floor(createdAt / day) * day;
		const end = Math.floor(Date.now() / day) * day - day;
		if (start > end) return 0;
		const ranges = [];
		for (let from = start; from <= end; from += 365 * day) ranges.push({
			start: new Date(from).toISOString().slice(0, 10),
			end: new Date(Math.min(from + 364 * day, end)).toISOString().slice(0, 10)
		});
		const values = await Promise.all(ranges.map(async (range) => {
			const response = await fetch(`https://api.npmjs.org/downloads/point/${range.start}:${range.end}/${encoded}`, { signal: AbortSignal.timeout(5e3) });
			if (!response.ok) return void 0;
			const data = await response.json();
			if (data === null || typeof data !== "object") return void 0;
			const { package: name, downloads, start, end } = data;
			return name === packageName && start === range.start && end === range.end && typeof downloads === "number" && Number.isSafeInteger(downloads) && downloads >= 0 ? downloads : void 0;
		}));
		if (values.some((value) => value === void 0)) return void 0;
		const total = values.reduce((sum, value) => sum + value, 0);
		return Number.isSafeInteger(total) ? total : void 0;
	} catch {
		return;
	}
}
const SUITE_MEMBER_PACKAGES = [
	"@michengai/dsh-archive-manager",
	"@michengai/dsh-codex-ui",
	"@michengai/dsh-skills-manager",
	"@michengai/dsh-agency-agents",
	"@michengai/dsh-im-connect",
	"@michengai/dsh-automation"
];
const MANAGED_DEPENDENCIES = [
	{
		id: "experts",
		packageName: "@michengai/dsh-agency-agents"
	},
	{
		id: "skills",
		packageName: "@michengai/dsh-skills-manager"
	},
	{
		id: "archive",
		packageName: "@michengai/dsh-archive-manager"
	},
	{
		id: "im",
		packageName: "@michengai/dsh-im-connect"
	},
	{
		id: "schedule",
		packageName: "@michengai/dsh-automation"
	},
	{
		id: "btw",
		packageName: "@michengai/dsh-btw"
	},
	{
		id: "simplify",
		packageName: "@michengai/dsh-simplify"
	},
	{
		id: "pua",
		packageName: "@michengai/dsh-pua"
	},
	{
		id: "review",
		packageName: "@michengai/dsh-code-review"
	},
	{
		id: "pet",
		packageName: "@michengai/dsh-codex-pet"
	},
	{
		id: "market",
		packageName: "dshmarket"
	}
];
function managedDependency(id) {
	return MANAGED_DEPENDENCIES.find((dependency) => dependency.id === id);
}
//#endregion
//#region lib/types/dependency-manager.js
/** The host's Node runtime; typed locally because the client face augments the global. */
const nodeProcess = process$1;
function optionalService(ctx, name) {
	if (ctx === void 0) return void 0;
	return typeof ctx.get === "function" ? ctx.get(name) : ctx[name];
}
function validProfileName(value) {
	return typeof value === "string" && value !== "" && value !== "." && value !== ".." && value !== "node_modules" && !value.includes("/") && !value.includes("\\") && !/[\0-\x1f\x7f]/.test(value);
}
function profileNameFromArgv(argv) {
	for (let index = 2; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--profile") return argv[index + 1];
		if (argument?.startsWith("--profile=")) return argument.slice(10);
	}
	return argv[2] === "web" ? "web" : void 0;
}
function detectHostRuntimeRoot(env) {
	if (typeof env.DSH_RUNTIME_DIR === "string" && isAbsolute(env.DSH_RUNTIME_DIR)) return resolve(env.DSH_RUNTIME_DIR);
}
/**
* 运行时解析：优先通过宿主官方 profileContext 服务提取当前 Profile，
* 不再自建 CLI 探测与包管理 spawn。
*/
function resolveDependencyRuntime(ctx, options = {}) {
	const env = options.env ?? nodeProcess.env;
	const argv = options.argv ?? nodeProcess.argv;
	const home = options.homeDir ?? homedir();
	const profileContext = optionalService(ctx, "profileContext");
	const pluginManager = optionalService(ctx, "pluginManager");
	if (profileContext !== void 0) {
		if (typeof profileContext.dir !== "string" || !isAbsolute(profileContext.dir)) throw new Error("DSH 当前 Profile 路径无效，请重启 DSH 后重试。");
		const profileDir = resolve(profileContext.dir);
		const profileName = validProfileName(profileContext.name) ? profileContext.name : validProfileName(basename(profileDir)) ? basename(profileDir) : "web";
		const detectedRoot = detectHostRuntimeRoot(env);
		return {
			environmentKind: profileName === "desktop" ? "desktop" : "cli",
			profileName,
			profileDir,
			runtimeRoots: detectedRoot !== void 0 ? [detectedRoot] : [],
			...pluginManager === void 0 ? {} : { pluginManager }
		};
	}
	const profiles = optionalService(ctx, "desktopProfiles");
	if (profiles !== void 0) {
		const current = profiles.current;
		if (!validProfileName(current?.name) || typeof current.dir !== "string" || !isAbsolute(current.dir)) throw new Error("DSH Desktop 当前 Profile 信息无效，请重启 Desktop 后重试。");
		const profileDir = resolve(current.dir);
		const detectedRoot = detectHostRuntimeRoot(env);
		const runtimeRoots = detectedRoot !== void 0 ? [detectedRoot] : [];
		return {
			environmentKind: "desktop",
			profileName: current.name,
			profileDir,
			runtimeRoots,
			...pluginManager === void 0 ? {} : { pluginManager }
		};
	}
	const profileDir = resolve(env.DSH_PROFILE_DIR ?? resolve(home, ".dsh", "profiles", "web"));
	const selected = profileNameFromArgv(argv);
	const profileName = validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : "web";
	const detectedRoot = detectHostRuntimeRoot(env);
	return {
		environmentKind: "cli",
		profileName,
		profileDir,
		runtimeRoots: detectedRoot !== void 0 ? [detectedRoot] : [],
		...pluginManager === void 0 ? {} : { pluginManager }
	};
}
function profileDirectory(runtime) {
	return runtime.profileDir;
}
/** 卸载后残留的 node_modules 在 bundles 清除后不得继续标为已安装。 */
function isManagedPackageInstalled(input) {
	return input.declared && input.installedVersion !== void 0;
}
/** 旧 Suite 对其六个成员拥有声明权；迁移成直接依赖前也应显示真实安装版本。 */
function isManagedPackageDeclared(packageName, declared) {
	return declared.includes(packageName) || declared.includes("@michengai/dsh-codex-suite") && SUITE_MEMBER_PACKAGES.includes(packageName);
}
/** 更新旧 Suite 中任一成员时，必须一次提升全部成员，避免移除 Suite 后只剩一个插件。 */
function directPackagesForInstall(requested, declared) {
	const migrateSuite = declared.includes("@michengai/dsh-codex-suite") && requested.some((packageName) => SUITE_MEMBER_PACKAGES.includes(packageName));
	return [...new Set(migrateSuite ? [...SUITE_MEMBER_PACKAGES, ...requested] : requested)];
}
function parseSemver(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
	if (!match) return void 0;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] ?? ""
	};
}
function comparePrerelease(a, b) {
	if (a === "" && b === "") return 0;
	if (a === "") return 1;
	if (b === "") return -1;
	const partsA = a.split(".");
	const partsB = b.split(".");
	const len = Math.max(partsA.length, partsB.length);
	for (let i = 0; i < len; i += 1) {
		const itemA = partsA[i];
		const itemB = partsB[i];
		if (itemA === void 0) return -1;
		if (itemB === void 0) return 1;
		const isNumA = /^\d+$/.test(itemA);
		const isNumB = /^\d+$/.test(itemB);
		if (isNumA && isNumB) {
			const numA = Number(itemA);
			const numB = Number(itemB);
			if (numA !== numB) return numA > numB ? 1 : -1;
			continue;
		}
		if (isNumA && !isNumB) return -1;
		if (!isNumA && isNumB) return 1;
		if (itemA !== itemB) return itemA > itemB ? 1 : -1;
	}
	return 0;
}
function newerVersion(installed, latest) {
	const parsedInstalled = parseSemver(installed);
	const parsedLatest = parseSemver(latest);
	if (!parsedInstalled || !parsedLatest) return false;
	if (parsedLatest.major !== parsedInstalled.major) return parsedLatest.major > parsedInstalled.major;
	if (parsedLatest.minor !== parsedInstalled.minor) return parsedLatest.minor > parsedInstalled.minor;
	if (parsedLatest.patch !== parsedInstalled.patch) return parsedLatest.patch > parsedInstalled.patch;
	return comparePrerelease(parsedLatest.prerelease, parsedInstalled.prerelease) > 0;
}
async function npmLatestVersion(packageName) {
	const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
	try {
		const response = await fetch(url, {
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(5e3)
		});
		if (!response.ok) return void 0;
		const data = await response.json();
		return typeof data.version === "string" && data.version !== "" ? data.version : void 0;
	} catch {
		return;
	}
}
async function profileBundleNames(runtime) {
	const manifestPath = join(profileDirectory(runtime), "package.json");
	if (!existsSync(manifestPath)) return [];
	try {
		const bundles = JSON.parse(await readFile(manifestPath, "utf8")).dsh?.profile?.bundles;
		return Array.isArray(bundles) && bundles.every((b) => typeof b === "string") ? bundles : [];
	} catch {
		return [];
	}
}
async function declaredPluginNames(runtime) {
	const bundles = await profileBundleNames(runtime);
	const manifestPath = join(profileDirectory(runtime), "package.json");
	if (!existsSync(manifestPath)) return bundles;
	try {
		const deps = JSON.parse(await readFile(manifestPath, "utf8")).dependencies;
		const names = deps !== null && typeof deps === "object" ? Object.keys(deps) : [];
		return [...new Set([...bundles, ...names])];
	} catch {
		return bundles;
	}
}
async function installedPackageVersion(packageName, runtime) {
	const candidate = join(profileDirectory(runtime), "node_modules", ...packageName.split("/"), "package.json");
	if (existsSync(candidate)) try {
		const manifest = JSON.parse(await readFile(candidate, "utf8"));
		if (typeof manifest.version === "string" && manifest.version !== "") return manifest.version;
	} catch {}
}
async function dependencyStatuses(runtime = resolveDependencyRuntime()) {
	const bundles = await profileBundleNames(runtime);
	return Promise.all(MANAGED_DEPENDENCIES.map(async (item) => {
		const [installedVersion, latestVersion, totalDownloads] = await Promise.all([
			installedPackageVersion(item.packageName, runtime),
			npmLatestVersion(item.packageName),
			npmTotalDownloads(item.packageName)
		]);
		const installed = isManagedPackageInstalled({
			installedVersion,
			declared: isManagedPackageDeclared(item.packageName, bundles)
		});
		const updateAvailable = installed && installedVersion !== void 0 && latestVersion !== void 0 ? newerVersion(installedVersion, latestVersion) : false;
		return {
			id: item.id,
			packageName: item.packageName,
			installed,
			version: installed ? installedVersion : void 0,
			latestVersion,
			totalDownloads,
			updateAvailable
		};
	}));
}
const progressState = {
	active: false,
	target: "",
	startedAt: 0,
	seconds: 0,
	lastLine: "",
	phase: null,
	done: 0,
	total: null,
	percent: null,
	currentPackage: null
};
function beginInstallProgress(target) {
	progressState.active = true;
	progressState.target = target;
	progressState.startedAt = Date.now();
	progressState.seconds = 0;
	progressState.lastLine = "";
	progressState.phase = "resolving";
	progressState.done = 0;
	progressState.total = null;
	progressState.percent = null;
	progressState.currentPackage = null;
}
function endInstallProgress() {
	progressState.active = false;
}
function installProgressSnapshot() {
	return {
		active: progressState.active,
		target: progressState.target,
		seconds: progressState.active && progressState.startedAt > 0 ? Math.max(0, Math.round((Date.now() - progressState.startedAt) / 1e3)) : 0,
		lastLine: progressState.lastLine,
		phase: progressState.phase,
		done: progressState.done,
		total: progressState.total,
		percent: progressState.percent,
		currentPackage: progressState.currentPackage
	};
}
/** 接收宿主官方 plugin-manager/install-state 广播事件，对齐官方安装进度阶段。 */
function noteHostInstallState(event) {
	if (event === null || typeof event !== "object") return;
	const data = event;
	if (typeof data.phase === "string") {
		if (data.phase === "resolving" || data.phase === "downloading" || data.phase === "linking" || data.phase === "building") progressState.phase = data.phase;
	}
}
function noteInstallOutput(chunk) {
	if (chunk === "") return;
	const trimmed = chunk.trim();
	if (trimmed !== "") progressState.lastLine = trimmed.slice(0, 200);
}
let installing = false;
async function installDependency(id, runtime = resolveDependencyRuntime()) {
	if (installing) throw new Error("已有依赖安装正在进行，请等待完成后再试。");
	installing = true;
	try {
		return await installDependenciesLocked([id], runtime);
	} finally {
		installing = false;
	}
}
/** 顶部批量操作同时安装缺失插件并更新落后版本。 */
function updatableDependencyIds(statuses) {
	return statuses.filter((status) => !status.installed || status.updateAvailable).map((status) => status.id);
}
async function updateAllDependencies(runtime = resolveDependencyRuntime()) {
	if (installing) throw new Error("已有依赖安装正在进行，请等待完成后再试。");
	installing = true;
	try {
		const current = await dependencyStatuses(runtime);
		const ids = updatableDependencyIds(current);
		if (ids.length === 0) return {
			dependencies: current,
			application: "applied",
			updatedCount: 0,
			results: []
		};
		return await installDependenciesLocked(ids, runtime);
	} finally {
		installing = false;
	}
}
async function installDependenciesLocked(ids, runtime) {
	if (typeof runtime.pluginManager?.installBundle !== "function") throw new Error("DSH 宿主插件管理服务尚未就绪，请重启 DSH 后重试。");
	const dependencies = [...new Set(ids)].map((id) => {
		const dependency = managedDependency(id);
		if (dependency === void 0) throw new Error("不支持安装该依赖。");
		return dependency;
	});
	const declared = await declaredPluginNames(runtime);
	if (declared.includes("@michengai/dsh-codex-suite") && dependencies.some((dependency) => SUITE_MEMBER_PACKAGES.includes(dependency.packageName))) throw new Error("旧套件成员暂不支持自动迁移，请通过宿主插件管理器处理。");
	const requestedTargets = await Promise.all(dependencies.map(async (dependency) => {
		const latestVersion = await npmLatestVersion(dependency.packageName);
		if (latestVersion === void 0) throw new Error("无法获取 npm 最新版本，请检查网络或 npm registry 后重试。");
		return {
			packageName: dependency.packageName,
			version: latestVersion
		};
	}));
	const requestedVersions = new Map(requestedTargets.map((target) => [target.packageName, target.version]));
	const targetPackages = directPackagesForInstall(requestedTargets.map((target) => target.packageName), declared);
	const targets = await Promise.all(targetPackages.map(async (packageName) => {
		const requestedVersion = requestedVersions.get(packageName);
		if (requestedVersion !== void 0) return {
			packageName,
			version: requestedVersion
		};
		const version = await installedPackageVersion(packageName, runtime) ?? await npmLatestVersion(packageName);
		if (version === void 0) throw new Error("无法读取成员版本，请检查 npm 安装后重试。");
		return {
			packageName,
			version
		};
	}));
	beginInstallProgress(targets.map((target) => `${target.packageName}@${target.version}`).join(", "));
	const results = [];
	try {
		for (const target of targets) {
			noteInstallOutput(`dsh: delegating ${target.packageName}@${target.version} to host pluginManager`);
			let raw;
			let restore;
			try {
				if (await installedPackageVersion(target.packageName, runtime) !== void 0 && declared.includes(target.packageName) && typeof runtime.pluginManager.updateBundle === "function") {
					const update = await runtime.pluginManager.updateBundle(target.packageName, target.version);
					raw = update !== null && typeof update === "object" ? update.result : void 0;
					restore = update !== null && typeof update === "object" ? update.restore : void 0;
				} else raw = await runtime.pluginManager.installBundle(`${target.packageName}@${target.version}`);
			} catch (caught) {
				results.push({
					packageName: target.packageName,
					application: "failed",
					changed: null,
					error: { message: caught instanceof Error ? caught.message : String(caught) }
				});
				break;
			}
			const change = raw !== null && typeof raw === "object" ? raw : void 0;
			const valid = change && typeof change.changed === "boolean" && [
				"applied",
				"restart-required",
				"overridden",
				"failed",
				"cancelled"
			].includes(String(change.application));
			const application = valid ? change.application : "failed";
			const restored = restore !== null && typeof restore === "object" ? restore : void 0;
			const validRestore = restored && typeof restored.changed === "boolean" && [
				"applied",
				"restart-required",
				"overridden",
				"failed",
				"cancelled"
			].includes(String(restored.application));
			let errorInfo;
			if (change !== void 0) {
				const errObj = change.error && typeof change.error === "object" ? change.error : void 0;
				const pkgResult = change.packageResult && typeof change.packageResult === "object" ? change.packageResult : void 0;
				const code = typeof errObj?.code === "string" ? errObj.code : typeof change.code === "string" ? change.code : void 0;
				const diagnostic = typeof errObj?.diagnostic === "string" ? errObj.diagnostic : typeof change.diagnostic === "string" ? change.diagnostic : void 0;
				const message = typeof errObj?.message === "string" ? errObj.message : typeof change.error === "string" ? change.error : void 0;
				const kind = typeof pkgResult?.kind === "string" ? pkgResult.kind : void 0;
				if (code !== void 0 || diagnostic !== void 0 || message !== void 0 || kind !== void 0) errorInfo = {
					...code !== void 0 ? { code } : {},
					...diagnostic !== void 0 ? { diagnostic } : {},
					...message !== void 0 ? { message } : {},
					...kind !== void 0 ? { kind } : {}
				};
			}
			results.push({
				packageName: target.packageName,
				application,
				changed: valid ? change.changed : null,
				...validRestore ? { restore: {
					application: restored.application,
					changed: restored.changed
				} } : {},
				...application === "restart-required" && typeof change?.restartReason === "string" && [
					"no-hmr",
					"package-moved",
					"host-module",
					"unmanaged-plugin",
					"module-comparison"
				].includes(change.restartReason) ? { restartReason: change.restartReason } : {},
				...errorInfo !== void 0 ? { error: errorInfo } : {}
			});
			if (application === "failed" || application === "cancelled") break;
		}
		const application = results.find((r) => r.application === "failed" || r.application === "cancelled")?.application ?? (results.some((r) => r.application === "overridden") ? "overridden" : results.some((r) => r.application === "restart-required") ? "restart-required" : "applied");
		return {
			dependencies: await dependencyStatuses(runtime),
			application,
			updatedCount: results.filter((r) => r.changed && r.application !== "failed" && r.application !== "cancelled").length,
			results
		};
	} finally {
		endInstallProgress();
	}
}
//#endregion
//#region lib/types/dependencies-route.js
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/** Path scratches are not useful to a browser; keep our own explanations. */
function publicDependencyError(error) {
	const message = error instanceof Error ? error.message : "依赖管理暂不可用。";
	if (/[A-Za-z]:[\\/]|\/(?:home|root|Users|var|tmp)\//.test(message)) return "依赖管理暂不可用，请查看服务端日志。";
	return message;
}
/** Reject before reading the body or performing mutations. */
function authenticate(ctx, request, response) {
	const reject = (status, message) => {
		response.writeHead(status, JSON_HEADERS);
		response.end(JSON.stringify({ error: message }));
		return false;
	};
	try {
		const connection = ctx.get("connection");
		if (typeof connection?.requestRejection !== "function") {
			ctx.logger.warn("workspace-ui dependency REST authentication unavailable: no connection.requestRejection");
			return reject(503, "宿主认证服务暂不可用。");
		}
		const rejection = connection.requestRejection(request);
		if (rejection !== void 0) return reject(rejection, rejection === 401 ? "请先登录 DSH。" : "已拒绝不可信或跨站请求。");
		return true;
	} catch (error) {
		const reason = error instanceof Error ? `${error.name}: ${error.message}` : typeof error;
		ctx.logger.warn("workspace-ui dependency REST authentication failed: %s", reason);
		return reject(503, "宿主认证服务暂不可用。");
	}
}
/** Register the catalog routes when the host exposes a web server. */
function registerDependencyRoutes(ctx) {
	if (ctx.get("pluginManager") === void 0) return;
	const install = (host) => {
		const webServer = host.get("webServer");
		if (webServer === void 0 || typeof webServer.register !== "function") return;
		host.effect(() => {
			const dispose = webServer.register({
				kind: "exact",
				path: WORKSPACE_UI_API_ENDPOINTS.dependencies,
				handler: async (request, response) => {
					if (!authenticate(host, request, response)) return;
					const url = new URL(request.url ?? "/", "http://localhost");
					try {
						if (request.method === "GET") {
							if (url.searchParams.get("action") === "progress") {
								response.writeHead(200, JSON_HEADERS);
								response.end(JSON.stringify({ progress: installProgressSnapshot() }));
								return;
							}
							const dependencies = await dependencyStatuses(resolveDependencyRuntime(host));
							response.writeHead(200, JSON_HEADERS);
							response.end(JSON.stringify({ dependencies }));
							return;
						}
						if (request.method === "POST") {
							const runtime = resolveDependencyRuntime(host);
							const result = url.searchParams.get("action") === "update-all" ? await updateAllDependencies(runtime) : await installDependency(url.searchParams.get("dependency"), runtime);
							const failed = result.application === "failed" || result.application === "cancelled";
							let failureMessage;
							if (failed) if (result.application === "cancelled") failureMessage = "依赖安装已取消。";
							else {
								const failedItem = result.results.find((item) => item.application === "failed" || item.application === "cancelled");
								const errKind = failedItem?.error?.kind;
								const errCode = failedItem?.error?.code;
								const errMsg = failedItem?.error?.message ?? failedItem?.error?.diagnostic;
								if (errKind === "timeout" || errCode === "timeout" || /timeout|timed out/i.test(errMsg ?? "")) failureMessage = "插件安装超时，请检查网络后重试。";
								else failureMessage = "从 npm 安装或更新依赖失败。请检查网络或 npm registry 后重试。";
							}
							const sanitizedResults = result.results.map((item) => ({
								...item,
								...item.error !== void 0 ? { error: {
									...item.error,
									...item.error.message !== void 0 ? { message: publicDependencyError(new Error(item.error.message)) } : {},
									...item.error.diagnostic !== void 0 ? { diagnostic: publicDependencyError(new Error(item.error.diagnostic)) } : {}
								} } : {}
							}));
							response.writeHead(failed ? 503 : 200, JSON_HEADERS);
							response.end(JSON.stringify({
								...result,
								results: sanitizedResults,
								restartRequired: result.results.some((item) => item.application === "restart-required" || item.restore?.application === "restart-required"),
								autoReload: false,
								...failed && failureMessage !== void 0 ? { error: publicDependencyError(new Error(failureMessage)) } : {}
							}));
							return;
						}
						response.writeHead(405);
						response.end();
					} catch (error) {
						host.logger.warn("workspace-ui dependencies endpoint failed: %s", error);
						response.writeHead(503, JSON_HEADERS);
						response.end(JSON.stringify({ error: publicDependencyError(error) }));
					}
				}
			});
			return () => {
				dispose?.();
			};
		}, "workspace-ui: dependency catalog");
		host.effect(() => {
			if (typeof host.on !== "function") return () => {};
			return host.on("plugin-manager/install-state", (event) => {
				noteHostInstallState(event);
			});
		}, "workspace-ui: plugin-manager install state");
	};
	if (ctx.get("webServer") !== void 0) install(ctx);
	else ctx.inject(["webServer"], install);
}
//#endregion
//#region lib/types/index.js
/**
* Workspace picker plugin, node half. The browser keeps its viewing store in
* localStorage, which a copied `.dsh` home does not include. This half stores
* the extra-folder layer in that home so the copy carries it, behind the
* connection's existing authenticated `/api` fence.
*
* It also turns that layer into prompt context: the shipped host has neither the
* folder API nor a multi-root sandbox, so naming the folders is the only way a
* Session learns about them.
*
* The shipped host cannot repath a Workspace over its remote API either, so a
* second route moves the Workspace record itself in process, through the
* registry's own write path. A third route reports whether a directory still
* exists, which is what keeps a Session whose folder was deleted from being
* restored onto a dead root. A fourth route re-roots one such conversation
* through the working-directory service, which the browser calls before it
* makes that conversation current.
*/
/** Authenticated route the browser half reads and writes. */
const ROUTE = "/api/workspace-ui/folders";
/** Authenticated route that moves one host Workspace record onto a promoted folder. */
const PRIMARY_ROUTE = "/api/workspace-ui/primary";
/** Authenticated route reporting whether a directory still exists. */
const DIRECTORY_ROUTE = "/api/workspace-ui/directory";
/** Authenticated route moving one conversation off a folder that is gone. */
const REROOT_ROUTE = "/api/workspace-ui/reroot";
/** Prompt context naming the Session workspace's source folders. */
const CONTEXT_NAME = "workspace-ui:folders";
/** Required host service: the authenticated Fetch registry. */
const inject = ["connection"];
function dshHome() {
	const env = process.env.DSH_HOME;
	return env !== void 0 && env !== "" ? env : join(homedir(), ".dsh");
}
function layerPath() {
	return join(dshHome(), "storages", "workspace-ui-folders.json");
}
async function readLayer() {
	try {
		return parseFolderLayer(await readFile(layerPath(), "utf8"));
	} catch (error) {
		if (error.code === "ENOENT") return emptyFolderLayer();
		throw error;
	}
}
/** Read the layer from disk for prompt assembly, which cannot await. */
function readLayerSync() {
	try {
		return parseFolderLayer(readFileSync(layerPath(), "utf8"));
	} catch {
		return emptyFolderLayer();
	}
}
async function writeLayer(layer) {
	const path = layerPath();
	await mkdir(join(dshHome(), "storages"), { recursive: true });
	const temporary = `${path}.${process.pid}.tmp`;
	await writeFile(temporary, `${JSON.stringify(layer)}\n`, "utf8");
	await rename(temporary, path);
}
/** Workspace records of this host, or none when it has no workspace registry. */
function registeredWorkspaces(ctx) {
	try {
		const registry = ctx.get("workspaceRegistry");
		return registry === void 0 ? [] : registry.list();
	} catch {
		return [];
	}
}
/** The filesystem error code, when the thrown value carries one. */
function errorCode(error) {
	const code = error?.code;
	return typeof code === "string" ? code : "";
}
/** A readable message for any thrown value. */
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
/** One JSON response under the browser half's no-store policy. */
function jsonResponse(body, status) {
	const headers = { "cache-control": "no-store" };
	return status === void 0 ? Response.json(body, { headers }) : Response.json(body, {
		status,
		headers
	});
}
/**
* Whether one path can serve as a directory.
*
* A missing path is not an error, and any other refusal (including a permission
* failure) answers `true`, so an unreadable directory keeps behaving as it did
* before this probe existed instead of blocking on it.
* @param path - the directory to inspect.
* @returns whether the path is an existing directory, or a tolerated failure.
*/
async function directoryUsable(path) {
	try {
		return (await stat(path)).isDirectory();
	} catch (error) {
		const code = errorCode(error);
		return code !== "ENOENT" && code !== "ENOTDIR";
	}
}
/**
* Move one host Workspace record onto an existing directory.
*
* The host's remote API has no repath method, but the registry entity owns a
* single write path that stamps `updatedAt` and prunes its stale Session
* candidates, so driving it here is what the host itself would do. Every
* failure is a refusal value rather than a throw: the browser half has already
* applied its own layer by the time this runs, so a host that cannot move the
* record must not turn the action into an error.
* @param ctx - host context carrying the workspace registry.
* @param request - POST body naming the workspace and the directory it should own.
* @returns the canonical path when the record moved, or the reason it did not.
*/
async function promotePrimary(ctx, request) {
	try {
		let body;
		try {
			body = await request.json();
		} catch {
			return {
				ok: false,
				error: "the request body is not JSON"
			};
		}
		if (typeof body !== "object" || body === null) return {
			ok: false,
			error: "the request body is not an object"
		};
		const { workspaceId, path } = body;
		if (typeof workspaceId !== "string" || workspaceId === "") return {
			ok: false,
			error: "a workspace id is required"
		};
		if (typeof path !== "string" || path === "") return {
			ok: false,
			error: "a directory is required"
		};
		let canonical;
		try {
			canonical = await realpath(path);
			if (!(await stat(canonical)).isDirectory()) return {
				ok: false,
				error: `${path} is not a directory`
			};
		} catch (error) {
			return {
				ok: false,
				error: `the directory ${path} could not be used: ${messageOf(error)}`
			};
		}
		const registry = ctx.get("workspaceRegistry");
		if (registry === void 0) return {
			ok: false,
			error: "the host exposes no workspace registry"
		};
		if (typeof registry.get !== "function") return {
			ok: false,
			error: "the host exposes no workspace lookup"
		};
		const entity = registry.get(workspaceId);
		if (entity === void 0) return {
			ok: false,
			error: `unknown workspace ${workspaceId}`
		};
		if (typeof entity.path !== "string") return {
			ok: false,
			error: `the workspace ${workspaceId} reports no path`
		};
		let records;
		try {
			records = registry.list();
		} catch (error) {
			return {
				ok: false,
				error: `the workspace registry could not be listed: ${messageOf(error)}`
			};
		}
		const sessionIds = records.find((record) => record.id === workspaceId)?.sessionIds ?? [];
		if (sameDirectory(entity.path, canonical)) {
			const rerooted = await rerootMissingSessions(ctx, sessionIds, canonical);
			return {
				ok: true,
				path: canonical,
				changed: false,
				...rerooted === void 0 ? {} : { rerooted }
			};
		}
		const owner = records.find((record) => record.id !== workspaceId && typeof record.path === "string" && sameDirectory(record.path, canonical));
		if (owner !== void 0) return {
			ok: false,
			error: `${canonical} already belongs to workspace ${owner.id}`
		};
		if (typeof entity.mutate !== "function") return {
			ok: false,
			error: "the host workspace cannot be repathed"
		};
		await entity.mutate((record) => ({
			...record,
			path: canonical
		}));
		const rerooted = await rerootMissingSessions(ctx, sessionIds, canonical);
		return {
			ok: true,
			path: canonical,
			changed: true,
			...rerooted === void 0 ? {} : { rerooted }
		};
	} catch (error) {
		return {
			ok: false,
			error: messageOf(error)
		};
	}
}
/**
* Move the Sessions of one Workspace whose effective directory is gone onto the
* directory that Workspace now owns.
*
* A Session keeps its own working root, so only an unusable one is touched: a
* Session rooted in a source folder that still exists stays where it is, and one
* that is not live has no agent to move. Both services are read through optional
* service lookup, so a host that offers neither reports no rescue at all and this
* route answers exactly what it answered before a rescue existed.
* @param ctx - host context carrying the agent and working-directory services.
* @param sessionIds - the Workspace's Sessions, as the registry records them.
* @param target - the canonical directory the Workspace now owns.
* @returns one entry per Session the rescue acted on, or no entries at all.
*/
async function rerootMissingSessions(ctx, sessionIds, target) {
	try {
		const agents = ctx.get("agents");
		if (agents === void 0 || typeof agents.get !== "function") return void 0;
		const directories = ctx.get("workingDirectory");
		if (directories === void 0 || typeof directories.get !== "function" || typeof directories.set !== "function") return void 0;
		const rerooted = [];
		for (const sessionId of sessionIds) try {
			const agent = agents.get(sessionId);
			if (agent === void 0 || agent.session === void 0) continue;
			const current = directories.get(agent.session);
			if (current === void 0 || current === "" || await directoryUsable(current)) continue;
			await directories.set(agent, target);
			rerooted.push({
				sessionId,
				ok: true
			});
		} catch (error) {
			rerooted.push({
				sessionId,
				ok: false,
				error: messageOf(error)
			});
		}
		return rerooted;
	} catch {
		return;
	}
}
/**
* Report whether one path is an existing directory.
*
* A missing path is data, not an error. Any other refusal (including a
* permission failure) answers `exists: true`, so an unreadable directory keeps
* behaving as it did before the probe instead of blocking the user.
* @param request - GET whose `path` query names the directory to check.
* @returns whether the path is an existing directory, or why it could not be checked.
*/
async function checkDirectory(request) {
	try {
		const path = new URL(request.url).searchParams.get("path");
		if (path === null || path === "") return {
			ok: false,
			error: "a directory is required"
		};
		return {
			ok: true,
			exists: await directoryUsable(path)
		};
	} catch (error) {
		return {
			ok: false,
			error: messageOf(error)
		};
	}
}
/**
* Register the folder-layer route for this plugin's lifetime.
* @param ctx - host context carrying the connection Fetch registry.
*/
/**
* Move one conversation off a folder that is gone, onto its Workspace's primary.
*
* A conversation whose current directory still exists is never touched. The
* session controller resolves (resuming when needed) rather than the agent
* registry, because a stored conversation has no live agent and resuming does
* not stat the recorded cwd. Every other outcome is a refusal that changes
* nothing; nothing in here throws out of the route.
* @param ctx - host context carrying the session-controller and working-directory services.
* @param request - POST whose JSON body names the Session.
* @returns the outcome, or the reason nothing moved.
*/
async function rerootSession(ctx, request) {
	try {
		let body;
		try {
			body = await request.json();
		} catch {
			return {
				ok: false,
				reason: "the request body is not JSON"
			};
		}
		if (typeof body !== "object" || body === null) return {
			ok: false,
			reason: "the request body is not an object"
		};
		const sessionId = body.sessionId;
		if (typeof sessionId !== "string" || sessionId === "") return {
			ok: false,
			reason: "a session id is required"
		};
		const controllers = ctx.get("sessionController");
		if (controllers === void 0 || typeof controllers.resolveAgent !== "function") return {
			ok: false,
			reason: "the host exposes no session resolution"
		};
		const directories = ctx.get("workingDirectory");
		if (directories === void 0 || typeof directories.get !== "function" || typeof directories.set !== "function") return {
			ok: false,
			reason: "the host exposes no working directory"
		};
		const resolved = await controllers.resolveAgent(sessionId);
		const agent = resolved?.agent;
		if (agent === void 0) {
			const failure = resolved?.error?.message;
			return failure === void 0 || failure === "" ? {
				ok: false,
				reason: "session-not-resolvable"
			} : {
				ok: false,
				reason: "session-not-resolvable",
				error: failure
			};
		}
		const session = agent.session ?? { id: sessionId };
		const current = directories.get(session);
		if (current !== void 0 && current !== "" && await directoryUsable(current)) return {
			ok: true,
			changed: false
		};
		const layer = readLayerSync();
		const workspace = selectWorkspace(layer, registeredWorkspaces(ctx), session);
		if (workspace === void 0) return {
			ok: false,
			reason: "unknown-workspace"
		};
		const primary = effectivePrimary(layer, workspace);
		if (primary === "" || !await directoryUsable(primary)) return {
			ok: false,
			reason: "primary-missing",
			path: primary
		};
		await directories.set(agent, primary);
		return {
			ok: true,
			changed: true,
			path: primary
		};
	} catch (error) {
		return {
			ok: false,
			reason: "reroot-failed",
			error: messageOf(error)
		};
	}
}
function apply(ctx) {
	registerDependencyRoutes(ctx);
	ctx.connection.fetch.register({
		path: ROUTE,
		methods: ["GET", "POST"],
		requestBody: "buffered",
		fetch: async (request) => {
			try {
				if (request.method === "GET") return Response.json(await readLayer(), { headers: { "cache-control": "no-store" } });
				const layer = parseFolderLayer(await request.text());
				await writeLayer(layer);
				return Response.json(layer, { headers: { "cache-control": "no-store" } });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return Response.json({ error: message }, {
					status: 500,
					headers: { "cache-control": "no-store" }
				});
			}
		}
	});
	ctx.connection.fetch.register({
		path: PRIMARY_ROUTE,
		methods: ["POST"],
		requestBody: "buffered",
		fetch: async (request) => {
			const result = await promotePrimary(ctx, request);
			return result.ok ? jsonResponse(result) : jsonResponse(result, 500);
		}
	});
	ctx.connection.fetch.register({
		path: DIRECTORY_ROUTE,
		methods: ["GET"],
		requestBody: "buffered",
		fetch: async (request) => {
			const result = await checkDirectory(request);
			return result.ok ? jsonResponse(result) : jsonResponse(result, 500);
		}
	});
	ctx.connection.fetch.register({
		path: REROOT_ROUTE,
		methods: ["POST"],
		requestBody: "buffered",
		fetch: async (request) => {
			const result = await rerootSession(ctx, request);
			return result.ok ? jsonResponse(result) : jsonResponse(result, 500);
		}
	});
	ctx.inject(["systemPrompt"], (scope) => {
		scope.systemPrompt.context({
			name: CONTEXT_NAME,
			order: scope.systemPrompt.getContextOrder("SANDBOX_POLICY") + 1,
			text: (context) => sourceFoldersContext(readLayerSync(), registeredWorkspaces(ctx), context.agent?.session ?? {}),
			interpolate: false
		});
	});
}
//#endregion
export { apply, inject };
