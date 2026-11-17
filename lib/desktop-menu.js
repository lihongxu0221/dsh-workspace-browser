// lib/types/business-api.js
var WORKSPACE_UI_API_BASE = "/api/workspace-ui/extensions";
var WORKSPACE_UI_RESTART_HEADER = "x-workspace-ui-restart-key";
var WORKSPACE_UI_API_ENDPOINTS = Object.freeze({
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

// lib/types/profile-resolver.js
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
var nodeProcess = process;
function resolveCurrentProfile(ctx, customHomeDir) {
  const homeDir = customHomeDir ?? nodeProcess.env.DSH_HOME ?? join(homedir(), ".dsh");
  let profileName;
  let profileDir;
  try {
    const launched = ctx?.get?.("profileContext");
    if (typeof launched?.name === "string" && launched.name.trim()) {
      profileName = launched.name.trim();
    }
    if (typeof launched?.dir === "string" && isAbsolute(launched.dir)) {
      profileDir = resolve(launched.dir);
    }
  } catch {
  }
  if (!profileDir && nodeProcess.env.DSH_PROFILE_DIR) {
    try {
      profileDir = resolve(nodeProcess.env.DSH_PROFILE_DIR);
      if (!profileName) {
        profileName = basename(profileDir);
      }
    } catch {
    }
  }
  if (!profileName && typeof process !== "undefined" && Array.isArray(nodeProcess.argv)) {
    const argv = nodeProcess.argv;
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === "--profile" && argv[i + 1]) {
        profileName = argv[i + 1].trim();
        break;
      }
      if (typeof arg === "string" && arg.startsWith("--profile=")) {
        profileName = arg.slice("--profile=".length).trim();
        break;
      }
    }
  }
  if (!profileName && nodeProcess.env.DSH_PROFILE) {
    profileName = nodeProcess.env.DSH_PROFILE.trim();
  }
  if (!profileName) {
    profileName = "web";
  }
  if (!profileDir) {
    profileDir = join(homeDir, "profiles", profileName);
  }
  return { profileName, profileDir, homeDir };
}
function isSubPluginDisabledOnDisk(id, homeDir, ctx) {
  try {
    const { profileDir } = resolveCurrentProfile(ctx, homeDir);
    const patchPath = join(profileDir, "cordis.patch.yml");
    if (existsSync(patchPath)) {
      const content = readFileSync(patchPath, "utf8");
      const itemBlocks = content.split(/(?:\r?\n)(?=-\s+)/);
      for (let i = itemBlocks.length - 1; i >= 0; i--) {
        const block = itemBlocks[i];
        const idRegex = new RegExp(`(?:^|\\s)id:\\s*['"]?${id}['"]?(?:\\s|$)`, "m");
        if (idRegex.test(block)) {
          if (/(?:^|\s)disabled:\s*true(?:\s|$)/m.test(block))
            return true;
          if (/(?:^|\s)disabled:\s*false(?:\\s|$)/m.test(block))
            return false;
          return false;
        }
      }
    }
  } catch {
  }
  return false;
}

// lib/types/desktop-menu-route.js
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync as readFileSync2 } from "node:fs";
import process3 from "node:process";
import { dirname as dirname2 } from "node:path";

// lib/types/restart.js
import { spawn } from "node:child_process";
import process2 from "node:process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join as join2 } from "node:path";
var nodeProcess2 = process2;
var MAC_BUNDLE_ID = "com.deepseek.dsh";
function baseName(value) {
  const parts = String(value).split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}
function detectApp(input = {}) {
  const platform = typeof input.platform === "string" ? input.platform : nodeProcess2.platform;
  const execPath = typeof input.execPath === "string" ? input.execPath : nodeProcess2.execPath;
  const env = input.env ?? nodeProcess2.env;
  if (platform === "darwin") {
    const marker = ".app/Contents/MacOS/";
    const index = execPath.indexOf(marker);
    const appPath = index === -1 ? "" : execPath.slice(0, index + ".app".length);
    return {
      platform,
      kind: appPath === "" ? "node" : "mac",
      appPath,
      execPath,
      imageName: baseName(execPath),
      canRestart: appPath !== ""
    };
  }
  if (platform === "win32") {
    const name2 = baseName(execPath);
    const lower2 = name2.toLowerCase();
    const isApp = lower2.endsWith(".exe") && lower2 !== "node.exe" && lower2 !== "electron.exe";
    return {
      platform,
      kind: isApp ? "win" : "node",
      appPath: isApp ? execPath : "",
      execPath,
      imageName: name2,
      canRestart: isApp
    };
  }
  const appImage = typeof env.APPIMAGE === "string" ? env.APPIMAGE.trim() : "";
  const resolved = appImage !== "" ? appImage : execPath;
  const lower = baseName(resolved).toLowerCase();
  const runtime = lower === "" || lower === "node" || lower === "node.exe" || lower === "electron" || lower === "electron.exe";
  return {
    platform,
    kind: runtime ? "node" : "linux",
    appPath: runtime ? "" : resolved,
    execPath: resolved,
    imageName: baseName(resolved),
    canRestart: !runtime
  };
}
var DEFAULT_QUIT_TIMEOUT_MS = 2e4;
var DEFAULT_OPEN_DELAY_MS = 800;
function buildPlan(app, options) {
  return {
    platform: app.platform,
    kind: app.kind,
    appPath: app.appPath,
    imageName: app.imageName,
    appId: MAC_BUNDLE_ID,
    match: app.kind === "mac" ? `${app.appPath}/Contents/` : app.execPath,
    logPath: options.logPath,
    statePath: options.statePath ?? "",
    mainPid: options.mainPid ?? 0,
    hostPid: options.hostPid ?? 0,
    bootId: options.bootId ?? "",
    quitTimeoutMs: options.quitTimeoutMs ?? DEFAULT_QUIT_TIMEOUT_MS,
    openDelayMs: options.openDelayMs ?? DEFAULT_OPEN_DELAY_MS
  };
}
function helperSource(plan) {
  return `'use strict'
// DeepSeek Harness \u91CD\u542F\u52A9\u624B\uFF08\u7531 workspace-ui \u751F\u6210\uFF0C\u653E\u5728\u4E34\u65F6\u76EE\u5F55\uFF0C\u53EF\u968F\u65F6\u5220\u9664\uFF09
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')

const plan = ${JSON.stringify(plan, null, 2)}
const SELF = nodeProcess.pid

function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function log(message) {
  try { fs.appendFileSync(plan.logPath, '[' + stamp() + '] workspace-ui restart: ' + message + '\\n') } catch {}
}

function writeState(phase, detail) {
  if (!plan.statePath) return
  try {
    fs.writeFileSync(plan.statePath, JSON.stringify({
      phase: phase, detail: detail || '', at: Date.now(), helper: SELF,
      platform: plan.platform, bootId: plan.bootId
    }), 'utf8')
  } catch (error) {
    log('\u5199\u72B6\u6001\u5931\u8D25: ' + (error && error.message ? error.message : String(error)))
  }
}

// \u91CD\u5F00\u65F6\u5FC5\u987B\u6458\u6389\u300C\u628A Electron \u5F53 Node \u7528\u300D\u7684\u5F00\u5173\uFF0C\u5426\u5219\u65B0\u5B9E\u4F8B\u53EA\u6709\u8FDB\u7A0B\u6CA1\u6709\u7A97\u53E3\u3002
const childEnv = (function () {
  const env = {}
  for (const key of Object.keys(nodeProcess.env)) {
    if (key.indexOf('ELECTRON_') === 0) continue
    if (key === 'NODE_OPTIONS' || key === 'NODE_PATH') continue
    env[key] = nodeProcess.env[key]
  }
  return env
})()

function run(command, args) {
  try {
    return spawnSync(command, args, { encoding: 'utf8', timeout: 20000, windowsHide: true, env: childEnv })
  } catch (error) {
    log('spawn \u5931\u8D25 ' + command + ': ' + (error && error.message ? error.message : String(error)))
    return { status: -1, stdout: '', stderr: '' }
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function alive(pid) {
  try { nodeProcess.kill(pid, 0); return true } catch { return false }
}

/** \u8FD8\u6D3B\u7740\u7684\u5E94\u7528\u8FDB\u7A0B\uFF08\u6C38\u8FDC\u6392\u9664\u52A9\u624B\u81EA\u5DF1\uFF09\u3002 */
function appPids() {
  const pids = []
  if (plan.platform === 'win32') {
    const result = run('tasklist', ['/FI', 'IMAGENAME eq ' + plan.imageName, '/NH', '/FO', 'CSV'])
    const text = String(result.stdout || '').trim()
    if (text === '' || /^INFO:/i.test(text)) return pids
    for (const line of text.split(/\\r?\\n/)) {
      const match = line.match(/^"([^"]+)","(\\d+)"/)
      if (match) pids.push(Number(match[2]))
    }
  } else {
    const result = run('ps', ['-Ao', 'pid=,command='])
    const needle = plan.match || plan.appPath
    for (const line of String(result.stdout || '').split('\\n')) {
      const match = line.match(/^\\s*(\\d+)\\s+(.*)$/)
      if (!match) continue
      if (needle !== '' && match[2].indexOf(needle) === -1) continue
      pids.push(Number(match[1]))
    }
  }
  return pids.filter(function (pid) { return pid !== SELF })
}

function waitUntil(predicate, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (predicate()) return true
    sleep(250)
  }
  return predicate()
}

/** Windows \u7684 tasklist \u770B\u4E0D\u5230\u547D\u4EE4\u884C\u53C2\u6570\uFF0C\u53EA\u80FD\u9000\u56DE\u300C\u8FDB\u7A0B\u5728\u5C31\u7B97\u8D77\u6765\u4E86\u300D\u3002 */
function windowSeen(ms) {
  if (plan.platform === 'win32') return true
  return waitUntil(function () {
    const result = run('ps', ['-Ao', 'pid=,command='])
    const needle = plan.match || plan.appPath
    return String(result.stdout || '').split('\\n').some(function (line) {
      return line.indexOf('--type=renderer') !== -1 && (needle === '' || line.indexOf(needle) !== -1)
    })
  }, ms)
}

/**
 * \u8BA9\u5E94\u7528\u9000\u51FA\u3002
 *
 * Windows \u53EA\u80FD\u7ED3\u675F Electron \u4E3B\u8FDB\u7A0B\uFF1A\u5B89\u88C5\u7248\u5BBF\u4E3B\u7684 window.on('close') \u662F\u65E0\u6761\u4EF6
 * preventDefault + hideMainWindow\uFF08\u6536\u8FDB\u6258\u76D8\uFF09\uFF0C\u6240\u4EE5 WM_CLOSE / CloseMainWindow \u6C38\u8FDC\u4E0D\u4F1A
 * \u8BA9\u5E94\u7528\u9000\u51FA\u3002\u7ED3\u675F\u4E3B\u8FDB\u7A0B\u540E\uFF0C\u4E3B\u8FDB\u7A0B\u9000\u51FA\uFF0C\u6211\u4EEC\u5148\u7ED9\u4E88 Host 3 \u79D2\u7B49\u5F85\u5176\u81EA\u884C\u843D\u76D8\u4E0E\u9000\u51FA\uFF0C
 * \u82E5\u8D85\u65F6\u4ECD\u672A\u9000\u51FA\u5219\u6309 PID \u6267\u884C\u515C\u5E95\u6E05\u7406\u3002
 * \u523B\u610F\u4E0D\u5E26 /T\uFF1A\u5E26 /T \u4F1A\u628A\u521A\u8D77\u7684\u52A9\u624B\u81EA\u5DF1\u4E00\u8D77\u6740\u6389\u3002
 */
function requestQuit() {
  if (plan.kind === 'win') {
    if (!plan.mainPid) {
      log('\u7F3A\u5C11\u4E3B\u8FDB\u7A0B PID\uFF0C\u653E\u5F03\u91CD\u542F')
      return false
    }
    const result = run('taskkill', ['/PID', String(plan.mainPid), '/F'])
    log('taskkill main pid=' + plan.mainPid + ' status=' + result.status)
    return true
  }
  if (plan.kind === 'mac') {
    const result = run('osascript', ['-e', 'tell application id "' + plan.appId + '" to quit'])
    log('osascript quit status=' + result.status)
    return result.status === 0
  }
  let sent = 0
  for (const pid of appPids()) {
    try { nodeProcess.kill(pid, 'SIGTERM'); sent += 1 } catch {}
  }
  log('SIGTERM \u53D1\u9001\u7ED9 ' + sent + ' \u4E2A\u8FDB\u7A0B')
  return sent > 0
}

function launch() {
  try {
    if (plan.kind === 'mac') {
      const first = run('open', ['-a', plan.appPath])
      if (first.status !== 0) {
        log('open -a \u5931\u8D25: ' + (first.stderr || first.status))
        const second = run('open', ['-b', plan.appId])
        if (second.status !== 0) return false
      }
      return waitUntil(function () { return appPids().some(alive) }, 20000) && windowSeen(20000)
    }
    const child = spawn(plan.appPath, [], {
      detached: true,
      stdio: 'ignore',
      cwd: plan.appPath.replace(/[\\\\/][^\\\\/]+$/, '') || undefined,
      env: childEnv,
      windowsHide: false,
    })
    child.once('error', function () {})
    child.unref()
    return waitUntil(function () { return appPids().some(alive) }, 20000)
  } catch (error) {
    log('\u91CD\u65B0\u6253\u5F00\u5931\u8D25: ' + (error && error.message ? error.message : String(error)))
    return false
  }
}

function main() {
  log('helper start pid=' + SELF + ' kind=' + plan.kind + ' platform=' + plan.platform)
  writeState('starting', '')
  sleep(1000)

  writeState('quitting', '')
  requestQuit()

  // Windows \u4E0A\u5224\u65AD\u300C\u5E94\u7528\u5DF2\u9000\u51FA\u300D\u4EE5 Electron \u4E3B\u8FDB\u7A0B\u4E3A\u51C6\uFF1A\u5B83\u624D\u662F\u7A97\u53E3\u4E0E\u6258\u76D8\u7684\u6240\u6709\u8005\u3002
  const targetGone = function () {
    return plan.platform !== 'win32' ? appPids().filter(alive).length === 0 : !alive(plan.mainPid)
  }
  if (!waitUntil(targetGone, plan.quitTimeoutMs)) {
    // \u4E3B\u8FDB\u7A0B\u6CA1\u6B7B\uFF1A\u4E0D\u8865\u5200\uFF0C\u5426\u5219\u53EF\u80FD\u7559\u4E0B\u4E24\u4E2A\u5B9E\u4F8B\u62A2\u540C\u4E00\u4E2A\u7AEF\u53E3\u3002
    log('\u4E3B\u8FDB\u7A0B\u4ECD\u5728\u8FD0\u884C\uFF0C\u672C\u6B21\u91CD\u542F\u4F5C\u5E9F\uFF0C\u4E0D\u52A8\u8FDB\u7A0B')
    writeState('cancelled', '\u5E94\u7528\u6CA1\u6709\u9000\u51FA')
    return
  }
  log('\u4E3B\u8FDB\u7A0B\u5DF2\u9000\u51FA')

  // \u4E3B\u8FDB\u7A0B\u4E00\u6B7B\uFF0CHost \u4F1A\u5931\u53BB\u7236\u5B50 IPC \u901A\u9053\u3002\u5148\u7ED9\u4E88 3 \u79D2\u8BA9 Host \u81EA\u884C\u6B63\u5E38\u6E05\u7406\u5E76\u843D\u76D8\u9000\u51FA\uFF1B
  // \u82E5\u8D85\u65F6\u4ECD\u672A\u9000\u51FA\uFF08\u4F9D\u7136\u5360\u7740\u5355\u5B9E\u4F8B\u9501\u548C\u7AEF\u53E3\uFF09\uFF0C\u518D\u6309 PID \u53D1\u8D77\u515C\u5E95\u6E05\u7406\u3002
  if (plan.platform === 'win32' && plan.hostPid && alive(plan.hostPid)) {
    var hostGone = waitUntil(function () { return !alive(plan.hostPid) }, 3000)
    if (!hostGone && alive(plan.hostPid)) {
      run('taskkill', ['/PID', String(plan.hostPid), '/F'])
      log('Host \u8D85\u65F6\u672A\u9000\uFF0C\u6267\u884C\u515C\u5E95\u6E05\u7406 pid=' + plan.hostPid)
      waitUntil(function () { return !alive(plan.hostPid) }, 3000)
    } else {
      log('Host \u5DF2\u81EA\u884C\u6B63\u5E38\u9000\u51FA pid=' + plan.hostPid)
    }
  }
  // \u7B49\u65E7\u5B9E\u4F8B\u7684\u6E32\u67D3\u8FDB\u7A0B\u7B49\u6563\u573A\uFF0C\u518D\u62C9\u65B0\u7684\u3002
  waitUntil(function () { return appPids().filter(alive).length === 0 }, 5000)

  sleep(Math.max(0, plan.openDelayMs))
  if (launch()) {
    writeState('relaunched', '')
    log('\u5E94\u7528\u5DF2\u91CD\u65B0\u6253\u5F00')
  } else {
    writeState('launch-failed', '')
    log('\u91CD\u5F00\u5931\u8D25\uFF1A\u8BF7\u624B\u52A8\u6253\u5F00 DeepSeek Harness')
  }
}

try { main() } catch (error) {
  log('helper \u5F02\u5E38: ' + (error && error.stack ? error.stack : String(error)))
} finally {
  try { fs.unlinkSync(nodeProcess.argv[1]) } catch {}
}
`;
}
function spawnHelper(plan) {
  try {
    const scriptPath = join2(tmpdir(), `wui-restart-${Date.now().toString(36)}.cjs`);
    writeFileSync(scriptPath, helperSource(plan), "utf8");
    const child = spawn(nodeProcess2.execPath, [scriptPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...nodeProcess2.env, ELECTRON_RUN_AS_NODE: "1" },
      cwd: dirname(scriptPath)
    });
    child.once("error", () => {
    });
    child.unref();
    return { ok: true, scriptPath };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
function defaultPaths() {
  const base = join2(tmpdir(), "dsh-workspace-ui-restart");
  return { logPath: join2(base, "restart.log"), statePath: join2(base, "state.json") };
}

// lib/types/desktop-menu-route.js
var nodeProcess3 = process3;
function headerValue(headers, key) {
  const value = headers[key];
  if (typeof value === "string")
    return value;
  if (Array.isArray(value) && typeof value[0] === "string")
    return value[0];
  return void 0;
}
function hostIsLoopback(host) {
  if (typeof host !== "string" || host.trim() === "")
    return false;
  const value = host.trim().toLowerCase();
  const name2 = value.startsWith("[") ? value.slice(1, value.indexOf("]")) : value.split(":")[0];
  return name2 === "127.0.0.1" || name2 === "localhost" || name2 === "::1" || name2 === "[::1]";
}
function tokenMatches(expected, provided) {
  if (typeof provided !== "string" || provided === "")
    return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length)
    return false;
  return timingSafeEqual(a, b);
}
function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(body)),
    "cache-control": "no-store"
  });
  response.end(body);
}
function createDesktopMenuHandler(deps) {
  const token = deps.token ?? randomBytes(16).toString("hex");
  const bootId = randomBytes(8).toString("hex");
  const paths = deps.paths ?? defaultPaths();
  const spawnPlan = deps.spawn ?? spawnHelper;
  let scheduledAt = 0;
  const scheduleTimeoutMs = 12e4;
  try {
    mkdirSync(dirname2(paths.statePath), { recursive: true });
    mkdirSync(dirname2(paths.logPath), { recursive: true });
  } catch {
  }
  const target = () => detectApp({ platform: deps.platform, execPath: deps.execPath, env: deps.env });
  const readState = () => {
    try {
      const state = JSON.parse(readFileSync2(paths.statePath, "utf8"));
      if (state.bootId !== bootId)
        return {};
      return state;
    } catch {
      return {};
    }
  };
  const statusView = () => {
    const app = target();
    const state = readState();
    return {
      enabled: !deps.isDisabled(),
      canRestart: app.canRestart,
      reason: app.canRestart ? void 0 : unsupportedReason(app.platform, app.kind),
      platform: app.platform,
      kind: app.kind,
      appPath: app.appPath,
      token,
      phase: state.phase,
      detail: state.detail
    };
  };
  return async (request, response) => {
    const rawUrl = typeof request.url === "string" ? request.url : "/";
    let url;
    try {
      url = new URL(rawUrl, "http://dsh.internal");
    } catch {
      sendJson(response, 400, { ok: false, error: "bad-url" });
      return;
    }
    if (!hostIsLoopback(headerValue(request.headers, "host"))) {
      sendJson(response, 403, { ok: false, error: "forbidden" });
      return;
    }
    const action = url.searchParams.get("action");
    if (action === null) {
      sendJson(response, 200, { enabled: !deps.isDisabled() });
      return;
    }
    if (action === "status") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { ok: false, error: "method" });
        return;
      }
      sendJson(response, 200, statusView());
      return;
    }
    if (action === "restart") {
      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, error: "method" });
        return;
      }
      if (!tokenMatches(token, headerValue(request.headers, WORKSPACE_UI_RESTART_HEADER))) {
        sendJson(response, 403, { ok: false, error: "bad-token" });
        return;
      }
      const app = target();
      if (!app.canRestart) {
        sendJson(response, 409, {
          ok: false,
          error: "unsupported",
          reason: unsupportedReason(app.platform, app.kind)
        });
        return;
      }
      if (scheduledAt !== 0 && Date.now() - scheduledAt < scheduleTimeoutMs) {
        sendJson(response, 409, { ok: false, error: "busy" });
        return;
      }
      scheduledAt = Date.now();
      const outcome = spawnPlan(buildPlan(app, {
        ...paths,
        mainPid: deps.mainPid ?? nodeProcess3.ppid,
        hostPid: deps.hostPid ?? nodeProcess3.pid,
        bootId
      }));
      if (!outcome.ok) {
        scheduledAt = 0;
        sendJson(response, 500, { ok: false, error: "spawn-failed", detail: outcome.error });
        return;
      }
      sendJson(response, 200, { ok: true, phase: "starting" });
      return;
    }
    sendJson(response, 404, { ok: false, error: "not-found" });
  };
}
function unsupportedReason(platform, kind) {
  if (kind !== "node")
    return void 0;
  if (platform === "win32" || platform === "darwin" || platform === "linux")
    return "missing-app";
  return "desktop-only";
}

// lib/types/desktop-menu-plugin.js
var name = "workspace-ui-desktop-menu";
var inject = ["webServer"];
var SUB_PLUGIN_ID = "workspace-ui-desktop-menu";
function isSubPluginDisabledOnDisk2(id, homeDir, ctx) {
  return isSubPluginDisabledOnDisk(id, homeDir, ctx);
}
function apply(ctx) {
  const endpoint = WORKSPACE_UI_API_ENDPOINTS.desktopMenu;
  const handler = createDesktopMenuHandler({
    isDisabled: () => isSubPluginDisabledOnDisk2(SUB_PLUGIN_ID, void 0, ctx)
  });
  ctx.effect(() => {
    const webServer = ctx.get("webServer");
    if (!webServer || typeof webServer.register !== "function")
      return () => {
      };
    const dispose = webServer.register({
      // 用 prefix 而非 exact：同一个端点要同时吃 `?action=status` 与 `?action=restart`
      kind: "prefix",
      path: endpoint,
      handler
    });
    return () => {
      dispose?.();
    };
  }, "workspace-ui: desktop menu state");
}
export {
  apply,
  inject,
  isSubPluginDisabledOnDisk2 as isSubPluginDisabledOnDisk,
  name
};
//# sourceMappingURL=desktop-menu.js.map
