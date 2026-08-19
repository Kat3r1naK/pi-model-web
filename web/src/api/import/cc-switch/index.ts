import { request } from "../../request";
import type {
	ImportAppType,
	ImportCcSwitchPayload,
	ImportCcSwitchResult,
	ScanCcSwitchResult,
} from "./types";

/** GET /api/import/cc-switch?appType=claude|codex：扫描 cc-Switch 候选配置（脱敏） */
export function scanCcSwitch(appType: ImportAppType) {
	return request<ScanCcSwitchResult>(`/api/import/cc-switch?appType=${encodeURIComponent(appType)}`);
}

/** POST /api/import/cc-switch：导入勾选的配置（key 由服务端直接写入，不经过浏览器） */
export function importCcSwitch(payload: ImportCcSwitchPayload) {
	return request<ImportCcSwitchResult>("/api/import/cc-switch", { method: "POST", body: payload });
}
