/**
 * Workspace picker plugin, node half. The browser keeps its viewing store in
 * localStorage, which a copied `.dsh` home does not include. This half stores
 * the extra-folder layer in that home so the copy carries it, behind the
 * connection's existing authenticated `/api` fence.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { emptyFolderLayer, parseFolderLayer } from "./folder-layer.js";
/** Authenticated route the browser half reads and writes. */
const ROUTE = '/api/workspace-browser/folders';
/** Required host service: the authenticated Fetch registry. */
export const inject = ['connection'];
function dshHome() {
    const env = process.env.DSH_HOME;
    return env !== undefined && env !== '' ? env : join(homedir(), '.dsh');
}
function layerPath() {
    return join(dshHome(), 'storages', 'workspace-browser-folders.json');
}
async function readLayer() {
    try {
        return parseFolderLayer(await readFile(layerPath(), 'utf8'));
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return emptyFolderLayer();
        throw error;
    }
}
async function writeLayer(layer) {
    const path = layerPath();
    await mkdir(join(dshHome(), 'storages'), { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(layer)}\n`, 'utf8');
    await rename(temporary, path);
}
/**
 * Register the folder-layer route for this plugin's lifetime.
 * @param ctx - host context carrying the connection Fetch registry.
 */
export function apply(ctx) {
    ctx.connection.fetch.register({
        path: ROUTE,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
            try {
                if (request.method === 'GET')
                    return Response.json(await readLayer(), { headers: { 'cache-control': 'no-store' } });
                const layer = parseFolderLayer(await request.text());
                await writeLayer(layer);
                return Response.json(layer, { headers: { 'cache-control': 'no-store' } });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return Response.json({ error: message }, { status: 500, headers: { 'cache-control': 'no-store' } });
            }
        },
    });
}
//# sourceMappingURL=index.js.map