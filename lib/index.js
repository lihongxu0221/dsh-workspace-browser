import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
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
/** Read one persisted layer. Malformed input becomes empty rather than throwing. */
function parseFolderLayer(raw) {
	try {
		const value = JSON.parse(raw);
		if (typeof value !== "object" || value === null) return emptyFolderLayer();
		const record = value;
		return {
			extraFoldersByWorkspace: stringListMap(record.extraFoldersByWorkspace),
			primaryByWorkspace: stringMap(record.primaryByWorkspace)
		};
	} catch {
		return emptyFolderLayer();
	}
}
//#endregion
//#region lib/types/index.js
/**
* Workspace picker plugin, node half. The browser keeps its viewing store in
* localStorage, which a copied `.dsh` home does not include. This half stores
* the extra-folder layer in that home so the copy carries it, behind the
* connection's existing authenticated `/api` fence.
*/
/** Authenticated route the browser half reads and writes. */
const ROUTE = "/api/workspace-browser/folders";
/** Required host service: the authenticated Fetch registry. */
const inject = ["connection"];
function dshHome() {
	const env = process.env.DSH_HOME;
	return env !== void 0 && env !== "" ? env : join(homedir(), ".dsh");
}
function layerPath() {
	return join(dshHome(), "storages", "workspace-browser-folders.json");
}
async function readLayer() {
	try {
		return parseFolderLayer(await readFile(layerPath(), "utf8"));
	} catch (error) {
		if (error.code === "ENOENT") return emptyFolderLayer();
		throw error;
	}
}
async function writeLayer(layer) {
	const path = layerPath();
	await mkdir(join(dshHome(), "storages"), { recursive: true });
	const temporary = `${path}.${process.pid}.tmp`;
	await writeFile(temporary, `${JSON.stringify(layer)}\n`, "utf8");
	await rename(temporary, path);
}
/**
* Register the folder-layer route for this plugin's lifetime.
* @param ctx - host context carrying the connection Fetch registry.
*/
function apply(ctx) {
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
}
//#endregion
export { apply, inject };
