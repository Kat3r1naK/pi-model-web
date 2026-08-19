/** POST /api/provider 入参与返回值 */

/**
 * 请求体。
 * 语义：字段留空 = 保留原值；显式删除需勾选对应 clearXxx。
 */
export interface SaveProviderPayload {
	id: string;
	originalId?: string;
	name?: string;
	baseUrl?: string;
	api?: string;
	oauth?: "" | "radius";
	apiKey?: string;
	authHeader?: boolean;
	headersJson?: string;
	compatJson?: string;
	modelOverridesJson?: string;
	clearBaseUrl?: boolean;
	clearApi?: boolean;
	clearApiKey?: boolean;
	clearOAuth?: boolean;
	clearHeaders?: boolean;
	clearCompat?: boolean;
	clearModelOverrides?: boolean;
}

/** 响应 */
export interface SaveProviderResult {
	ok: boolean;
	id: string;
	refreshError?: string;
}
