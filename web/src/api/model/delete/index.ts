import { request } from "../../request";
import type { DeleteModelPayload, DeleteModelResult } from "./types";

/** POST /api/model/delete：删除指定 provider 下的 model */
export function deleteModel(provider: string, id: string) {
	const body: DeleteModelPayload = { provider, id };
	return request<DeleteModelResult>("/api/model/delete", { method: "POST", body });
}
