export const WORKSPACE_UI_API_BASE = '/api/workspace-ui/extensions'

/** 请求重启时携带一次性令牌的请求头（客户端与 Host 共用）。 */
export const WORKSPACE_UI_RESTART_HEADER = 'x-workspace-ui-restart-key'

export const WORKSPACE_UI_API_ENDPOINTS = Object.freeze({
  dependencies: `${WORKSPACE_UI_API_BASE}/dependencies`,
  settingsSkin: `${WORKSPACE_UI_API_BASE}/settings-skin`,
  composer: `${WORKSPACE_UI_API_BASE}/composer`,
  composerModels: `${WORKSPACE_UI_API_BASE}/composer/models`,
  composerPrediction: `${WORKSPACE_UI_API_BASE}/composer/prediction`,
  composerPredictionStream: `${WORKSPACE_UI_API_BASE}/composer/prediction/stream`,
  sidebar: `${WORKSPACE_UI_API_BASE}/sidebar`,
  sections: `${WORKSPACE_UI_API_BASE}/sections`,
  theme: `${WORKSPACE_UI_API_BASE}/theme`,
  desktopMenu: `${WORKSPACE_UI_API_BASE}/desktop-menu`,
})
