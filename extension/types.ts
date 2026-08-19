/** 服务端公共类型 */

export type JsonObject = Record<string, unknown>;

export type ProviderConfig = JsonObject & { models?: unknown };

export type ModelsConfig = JsonObject & { providers: Record<string, ProviderConfig> };

/** 刷新 pi 运行时模型目录（保存/删除后调用） */
export type RefreshModels = () => Promise<void>;

/** pi 内置模型注册表元数据：导入/新建模型时校正参数 */
export interface ModelMeta {
	contextWindow?: number;
	maxTokens?: number;
	reasoning?: boolean;
	thinkingLevelMap?: Record<string, string | null>;
}

export type GetModelMeta = (id: string) => ModelMeta | undefined;
