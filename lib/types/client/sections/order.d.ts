/** 宿主的一次工作区移动；省略锚点表示移动到末尾。 */
export interface WorkspaceMove {
    workspaceId: string;
    beforeWorkspaceId: string | undefined;
}
/**
 * 生成一次性排序计划，不根据宿主中间帧反复纠偏。
 * 显式操作只允许移动给定的项目；启动恢复才允许调整整表。
 */
export declare function planWorkspaceMoves(current: readonly string[], desired: readonly string[], workspaceIds?: readonly string[]): WorkspaceMove[];
//# sourceMappingURL=order.d.ts.map