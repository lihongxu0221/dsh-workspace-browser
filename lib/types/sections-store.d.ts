import type { Context } from '@deepseek-ai/cordis';
/** 单个分区文档的体积上限：这是结构数据，超过就说明客户端出了问题。 */
export declare const SECTIONS_STORE_MAX_BYTES: number;
/** 分区数量上限。 */
export declare const SECTIONS_STORE_MAX_SECTIONS = 100;
/** 单个分区内成员上限。 */
export declare const SECTIONS_STORE_MAX_MEMBERS = 2000;
/** 落盘的分区文档；`sections` 的顺序即分区顺序，`ids` 的顺序即区内位置（等价 Codex 的 section_position）。 */
export interface SectionsDocument {
    version: number;
    sections: Array<{
        id: string;
        name: string;
        ids: string[];
    }>;
}
/** 非法文档：调用方据此回 400，且绝不覆盖已存在的合法文件。 */
export declare class SectionsDocumentError extends Error {
}
/**
 * 解析分区文档的落盘路径。
 *
 * @param ctx - 宿主 Context，可从中读到当前 profile。
 * @returns 绝对路径：`<profileDir>/plugin-data/michengai.dsh-codex-ui/workspace-sections.json`。
 */
export declare function resolveSectionsStorePath(ctx?: Context): string;
/** 校验并规范化分区文档；不合法时抛 {@link SectionsDocumentError}。 */
export declare function validateSectionsDocument(value: unknown): SectionsDocument;
/**
 * 读取分区文档。
 *
 * @param ctx - 宿主 Context。
 * @returns 文档；文件不存在或内容损坏时返回 `undefined`（损坏内容不会被删除，便于排查）。
 */
export declare function readSectionsDocument(ctx?: Context): SectionsDocument | undefined;
/**
 * 原子写入分区文档。
 *
 * @param ctx - 宿主 Context。
 * @param document - 已校验的文档。
 */
export declare function writeSectionsDocument(ctx: Context | undefined, document: SectionsDocument): void;
//# sourceMappingURL=sections-store.d.ts.map