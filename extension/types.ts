/** 服务端公共类型 */

export type JsonObject = Record<string, unknown>;

export type ProviderConfig = JsonObject & { models?: unknown };

export type ModelsConfig = JsonObject & { providers: Record<string, ProviderConfig> };

/** 刷新 pi 运行时模型目录（保存/删除后调用） */
export type RefreshModels = () => Promise<void>;
