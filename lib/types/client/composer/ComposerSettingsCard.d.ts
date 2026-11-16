import React from 'react';
export interface ComposerSettingsCardProps {
    t: (key: any) => string;
}
/**
 * 输入框增强设置卡片。
 *
 * 放预测开关与 ↑/↓ 历史召回范围；宽度手柄、建议卡片没有可调项，
 * 用不到就不渲染成灰项，遵循插件「不残留死配置」的既有约定。
 *
 * 站点级关闭（profile `cordis.patch.yml` 里 `config: { prediction: false }`）时，
 * 开关保持可见但置为关闭且禁用，并给出原因提示——比整卡消失更容易排查。
 */
export declare function ComposerSettingsCard({ t }: ComposerSettingsCardProps): React.JSX.Element | null;
//# sourceMappingURL=ComposerSettingsCard.d.ts.map