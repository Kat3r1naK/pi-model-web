/** GET/POST /api/import/cc-switch 入参与返回值 */

export type ImportAppType = "claude" | "codex";

/** 扫描出的候选配置（脱敏：无 apiKey 值，只有 hasApiKey 标志） */
export interface ImportCandidate {
	id: string;
	name: string;
	appType: ImportAppType;
	baseUrl?: string;
	/** 是否有可导入的 API Key（chatgpt OAuth 登录态为 false） */
	hasApiKey: boolean;
	authMode?: string;
}

/** GET 响应 */
export interface ScanCcSwitchResult {
	appType: ImportAppType;
	candidates: ImportCandidate[];
}

/** POST 请求体 */
export interface ImportCcSwitchPayload {
	appType: ImportAppType;
	ids: string[];
}

/** POST 响应 */
export interface ImportCcSwitchResult {
	ok: boolean;
	imported: string[];
	refreshError?: string;
}
