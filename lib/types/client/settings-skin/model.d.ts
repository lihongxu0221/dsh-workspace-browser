export type SettingsNavGroup = 'personal' | 'integrations' | 'records';
export interface SettingsNavGroupSpec {
    id: SettingsNavGroup;
    order: number;
    labelKey: string;
    defaultZh: string;
    defaultEn: string;
}
export declare const SETTINGS_NAV_GROUPS: readonly SettingsNavGroupSpec[];
/**
 * 菜单分组模型：
 * 仅置顶「个人」（账号与通用）与置底「记录与应用」（归档与关于），
 * 其余所有项不设规则枚举，统统自动归入「集成」，保持宿主与第三方生态的纯天然扩展性。
 */
export declare function classifySettingsButton(text: string): SettingsNavGroup;
//# sourceMappingURL=model.d.ts.map