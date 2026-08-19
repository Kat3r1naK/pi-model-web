/** GET /api/model/meta 返回值 */

/** pi 内置注册表里的官方模型参数（未命中的字段缺省） */
export interface ModelMetaInfo {
	contextWindow?: number;
	maxTokens?: number;
	reasoning?: boolean;
	thinkingLevelMap?: Record<string, string | null>;
}

/** 响应：found=false 表示模型不在 pi 内置注册表（中转站自定义模型属正常情况） */
export interface GetModelMetaResult {
	found: boolean;
	meta: ModelMetaInfo | null;
}
