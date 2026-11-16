import React from 'react';
export interface ModelReasoningEffort {
    id: string;
    name?: string;
}
export interface ModelEntry {
    id: string;
    name?: string;
    reasoning?: {
        efforts: ModelReasoningEffort[];
        defaultEffort?: string;
    } | null;
}
export interface ProviderEntry {
    id: string;
    name: string;
    models: ModelEntry[];
}
export interface PredictionModelPickerProps {
    t: (key: string) => string;
    disabled?: boolean;
}
export declare function clearClientModelCache(): void;
/**
 * 智能输入预测模型选择器（单字段级联选择组件）
 * 对齐官方 Chat 式单字段交互：
 * - 紧凑单字段展示；
 * - 默认「跟随当前会话」；
 * - 下拉通过 Menu Submenu 支持推理模型档位级联点选。
 */
export declare function PredictionModelPicker({ t, disabled }: PredictionModelPickerProps): React.JSX.Element;
//# sourceMappingURL=PredictionModelPicker.d.ts.map