import { request } from "../request";
import type { ConfigResponse } from "./types";

/** GET /api/config：读取 models.json（脱敏后） */
export function getConfig() {
	return request<ConfigResponse>("/api/config");
}
