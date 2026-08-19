import { request } from "../request";
import type { SaveModelPayload, SaveModelResult } from "./types";

/** POST /api/model：新建/更新指定 provider 下的 model */
export function saveModel(payload: SaveModelPayload) {
	return request<SaveModelResult>("/api/model", { method: "POST", body: payload });
}
