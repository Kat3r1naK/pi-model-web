import { request } from "../../request";
import type { DeleteProviderPayload, DeleteProviderResult } from "./types";

/** POST /api/provider/delete：删除 provider（级联删除其全部 models） */
export function deleteProvider(id: string) {
	const body: DeleteProviderPayload = { id };
	return request<DeleteProviderResult>("/api/provider/delete", { method: "POST", body });
}
