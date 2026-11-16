export declare const CODEX_UI_API_BASE = "/api/workspace-browser/extensions";
/** 请求重启时携带一次性令牌的请求头（客户端与 Host 共用）。 */
export declare const CODEX_UI_RESTART_HEADER = "x-dcu-restart-key";
export declare const CODEX_UI_API_ENDPOINTS: Readonly<{
    dependencies: "/api/workspace-browser/extensions/dependencies";
    settingsSkin: "/api/workspace-browser/extensions/settings-skin";
    composer: "/api/workspace-browser/extensions/composer";
    composerModels: "/api/workspace-browser/extensions/composer/models";
    composerPrediction: "/api/workspace-browser/extensions/composer/prediction";
    composerPredictionStream: "/api/workspace-browser/extensions/composer/prediction/stream";
    sidebar: "/api/workspace-browser/extensions/sidebar";
    sections: "/api/workspace-browser/extensions/sections";
    theme: "/api/workspace-browser/extensions/theme";
    desktopMenu: "/api/workspace-browser/extensions/desktop-menu";
}>;
//# sourceMappingURL=business-api.d.ts.map