/** 路由依赖与公共辅助 */
import type { GetModelMeta, RefreshModels } from "../types";

export interface RouteDeps {
	refreshModels: RefreshModels;
	/** 按模型 id 查 pi 内置注册表元数据，未命中返回 undefined（未知模型保留估算值） */
	getModelMeta?: GetModelMeta;
}

/** 保存/删除成功后刷新 pi 模型目录；失败不抛出，返回错误文案由接口带回前端提示 */
export async function refreshAfterChange(refreshModels: RefreshModels): Promise<string | undefined> {
	try {
		await refreshModels();
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}
