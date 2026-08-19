/** POST /api/provider/delete 入参与返回值 */

/** 请求体 */
export interface DeleteProviderPayload {
	id: string;
}

/** 响应 */
export interface DeleteProviderResult {
	ok: boolean;
	refreshError?: string;
}
