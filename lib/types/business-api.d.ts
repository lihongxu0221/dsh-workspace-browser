export declare const WORKSPACE_UI_API_BASE = "/api/workspace-ui/extensions";
/** 请求重启时携带一次性令牌的请求头（客户端与 Host 共用）。 */
export declare const WORKSPACE_UI_RESTART_HEADER = "x-workspace-ui-restart-key";
export declare const WORKSPACE_UI_API_ENDPOINTS: Readonly<{
    dependencies: "/api/workspace-ui/extensions/dependencies";
    settingsSkin: "/api/workspace-ui/extensions/settings-skin";
    composer: "/api/workspace-ui/extensions/composer";
    composerModels: "/api/workspace-ui/extensions/composer/models";
    composerPrediction: "/api/workspace-ui/extensions/composer/prediction";
    composerPredictionStream: "/api/workspace-ui/extensions/composer/prediction/stream";
    sidebar: "/api/workspace-ui/extensions/sidebar";
    sections: "/api/workspace-ui/extensions/sections";
    theme: "/api/workspace-ui/extensions/theme";
    desktopMenu: "/api/workspace-ui/extensions/desktop-menu";
}>;
//# sourceMappingURL=business-api.d.ts.map