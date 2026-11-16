/**
 * 工作区「分区」模型（纯函数，不触碰 DOM 与存储）。
 *
 * 分区是插件层的视图结构：宿主的工作区注册表仍是唯一事实来源，
 * 分区只决定「谁排在谁旁边」。因此模型里的分组成员顺序就是最终要写入宿主的顺序，
 * `flattenSections` 的结果与宿主 `workspaces` 的排列应当逐项一致。
 *
 * 不变式：
 * - 始终包含内置分区 `pinned`（置顶）与兜底分区 `default`（项目），且各只有一份；
 * - `default` 永远排在最后，`pinned` 可被拖到任意位置（Codex 同样允许）；
 * - 一个工作区最多出现在一个分区里，未知工作区在归一化时被丢弃。
 */
/** 内置「置顶」分区 id：可拖动、可重命名，但不能删除。 */
export declare const PINNED_SECTION_ID = "pinned";
/** 兜底「项目」分区 id：固定最后，成员是尚未归类的工作区。 */
export declare const DEFAULT_SECTION_ID = "default";
/** 持久化键；与侧栏导航布局分键，互不影响。 */
export declare const SECTIONS_STORAGE_KEY = "michengai.codex-ui.workspace-sections.v1";
/** 一个分区的持久化形态。 */
export interface WorkspaceSection {
    /** 稳定标识；内置分区固定为 `pinned` / `default`。 */
    id: string;
    /** 显示名称，用户可改名。 */
    name: string;
    /** 成员工作区 id，顺序即分区内顺序。 */
    ids: string[];
}
/** 分区集合的持久化形态。 */
export interface SectionsState {
    sections: WorkspaceSection[];
}
/** 新建用户的默认分区结构：置顶 + 项目，没有自定义分区。 */
export declare function createSectionsState(): SectionsState;
/** 判断是否内置分区（置顶与兜底），内置分区不允许删除。 */
export declare function isBuiltinSection(id: string): boolean;
/**
 * 解析持久化内容。
 * 结构不合法时返回 `undefined`，由调用方回退默认结构（与侧栏布局解析风格一致）。
 */
export declare function parseSections(raw: string | null | undefined): SectionsState | undefined;
/** 序列化为持久化字符串。 */
export declare function serializeSections(state: SectionsState): string;
/**
 * 用当前实际存在的工作区集合校正分区结构：
 * - 丢弃已删除的工作区、跨分区重复项（保留首次出现）与重复分区 id；
 * - 补齐缺失的内置分区，`default` 固定到最后；
 * - 名称空白的内置分区回退默认名。
 *
 * @param state - 待校正的结构。
 * @param knownIds - 宿主当前存在的工作区 id；省略时只做结构校正，不按存在性裁剪（启动早期宿主可能还没就绪）。
 * @returns 新的、满足不变式的结构。
 */
export declare function normalizeSections(state: SectionsState, knownIds?: readonly string[]): SectionsState;
/** 查找某个工作区所属分区 id。 */
export declare function sectionOf(state: SectionsState, workspaceId: string): string | undefined;
/** 按分区顺序摊平出的工作区顺序，即应当写入宿主的顺序。 */
export declare function flattenSections(state: SectionsState): string[];
/**
 * 把工作区放进指定分区。
 *
 * @param state - 当前结构。
 * @param workspaceId - 目标工作区。
 * @param sectionId - 目标分区。
 * @param index - 分区内插入位置；省略时追加到分区末尾。
 * @returns 新的结构；分区不存在时原样返回。
 */
export declare function assignWorkspace(state: SectionsState, workspaceId: string, sectionId: string, index?: number): SectionsState;
/** 新建自定义分区，插到兜底分区之前。 */
export declare function createSection(state: SectionsState, id: string, name: string): SectionsState;
/** 重命名分区；名称为空时忽略。 */
export declare function renameSection(state: SectionsState, sectionId: string, name: string): SectionsState;
/**
 * 删除自定义分区，成员并入兜底分区末尾。
 * 内置分区（置顶、项目）不可删除，原样返回。
 */
export declare function deleteSection(state: SectionsState, sectionId: string): SectionsState;
/**
 * 按给定的项目顺序重排各分区内部的成员顺序（分区之间的先后不变）。
 *
 * 用户在某分区内拖动项目后，宿主顺序已经是目标顺序；这里把同样的顺序写回分区成员，
 * 后续同步的「权威顺序」就不会把这次拖动再拽回原位。
 */
export declare function sortSectionMembers(state: SectionsState, order: readonly string[]): SectionsState;
/**
 * 调整分区顺序。
 *
 * @param state - 当前结构。
 * @param sectionId - 被移动的分区。
 * @param beforeSectionId - 插入到该分区之前；`null` 表示排到最后（兜底分区之前）。
 * @returns 新的结构；兜底分区不可移动，非法目标原样返回。
 */
export declare function moveSection(state: SectionsState, sectionId: string, beforeSectionId: string | null): SectionsState;
/** 判断某个分区是否可以向上移动（必须是非内置分区，且上方还有其他自定义分区）。 */
export declare function canMoveSectionUp(state: SectionsState, sectionId: string): boolean;
/** 判断某个分区是否可以向下移动（必须是非内置分区，且下方还有其他自定义分区）。 */
export declare function canMoveSectionDown(state: SectionsState, sectionId: string): boolean;
/** 向上移动自定义分区（与上方相邻的自定义分区交换位置）。 */
export declare function moveSectionUp(state: SectionsState, sectionId: string): SectionsState;
/** 向下移动自定义分区（与下方相邻的自定义分区交换位置）。 */
export declare function moveSectionDown(state: SectionsState, sectionId: string): SectionsState;
/**
 * 用宿主的最新顺序校正归属（用户在原生树上直接拖动项目后调用）。
 *
 * 判定方式：把新旧顺序做前后缀比较，找出唯一被移动的项；它归入「新位置上方最近的邻居」所属分区，
 * 没有上方邻居时归入下方邻居的分区，两侧都没有则落到兜底分区。
 * 其余项保持原归属。返回结构的分区摊平结果与新顺序逐项一致。
 *
 * @param state - 拖动前的结构。
 * @param order - 宿主当前的完整工作区顺序。
 * @returns 校正后的结构与是否发生变化。
 */
export declare function reconcileHostOrder(state: SectionsState, order: readonly string[], fallbackSectionId?: string): {
    state: SectionsState;
    changed: boolean;
};
//# sourceMappingURL=model.d.ts.map