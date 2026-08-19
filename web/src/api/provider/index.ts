import { request } from "../request";
import type { SaveProviderPayload, SaveProviderResult } from "./types";

/** POST /api/provider：新建/更新 provider（留空保留原值，删除走 clearXxx） */
export function saveProvider(payload: SaveProviderPayload) {
	return request<SaveProviderResult>("/api/provider", { method: "POST", body: payload });
}
