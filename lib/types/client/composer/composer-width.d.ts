export declare const COMPOSER_MIN_WIDTH = 640;
export declare const COMPOSER_EDGE_BUDGET = 176;
/** 按用户要求用最窄宽度替代宿主自适应默认；已有有效偏好不重置，拖拽起点沿用宿主存储。 */
export declare function initializeComposerWidth(storage: Pick<Storage, 'getItem' | 'setItem'>): void;
/** 新建页没有宿主 WidthHandle，补充同一宽度偏好的拖拽入口。 */
export declare function observeHeroWidthHandles(label: string): () => void;
//# sourceMappingURL=composer-width.d.ts.map