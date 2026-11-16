// lib/types/business-api.js
var CODEX_UI_API_BASE = "/api/workspace-browser/extensions";
var CODEX_UI_API_ENDPOINTS = Object.freeze({
  dependencies: `${CODEX_UI_API_BASE}/dependencies`,
  settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
  composer: `${CODEX_UI_API_BASE}/composer`,
  composerModels: `${CODEX_UI_API_BASE}/composer/models`,
  composerPrediction: `${CODEX_UI_API_BASE}/composer/prediction`,
  composerPredictionStream: `${CODEX_UI_API_BASE}/composer/prediction/stream`,
  sidebar: `${CODEX_UI_API_BASE}/sidebar`,
  sections: `${CODEX_UI_API_BASE}/sections`,
  theme: `${CODEX_UI_API_BASE}/theme`,
  desktopMenu: `${CODEX_UI_API_BASE}/desktop-menu`
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

// lib/types/settings-skin-plugin.js
var name = "workspace-browser-settings-skin";
var inject = ["webServer"];
function apply(ctx) {
  const endpoint = CODEX_UI_API_ENDPOINTS.settingsSkin;
  ctx.effect(() => {
    const webServer = ctx.get("webServer");
    if (!webServer || typeof webServer.register !== "function")
      return () => {
      };
    const dispose = webServer.register({
      kind: "exact",
      path: endpoint,
      handler: (_request, response) => {
        const disabled = isSubPluginDisabledOnDisk("workspace-browser-settings-skin", void 0, ctx);
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        });
        response.end(JSON.stringify({ enabled: !disabled }));
      }
    });
    return () => {
      dispose?.();
    };
  }, "michengai-codex-ui: settings skin state");
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=settings-skin.js.map
