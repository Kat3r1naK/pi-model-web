import { request } from "../../request";
import type { GetModelMetaResult } from "./types";

/** GET /api/model/meta?id=...：查 pi 内置注册表的官方参数（上下文/输出/reasoning/thinkingLevelMap） */
export function getModelMeta(id: string) {
	return request<GetModelMetaResult>(`/api/model/meta?id=${encodeURIComponent(id)}`);
}
