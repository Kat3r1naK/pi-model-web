/** 路由依赖与公共辅助 */
import type { RefreshModels } from "../types";

export interface RouteDeps {
	refreshModels: RefreshModels;
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
