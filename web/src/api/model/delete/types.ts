/** POST /api/model/delete 入参与返回值 */

/** 请求体 */
export interface DeleteModelPayload {
	provider: string;
	id: string;
}

/** 响应 */
export interface DeleteModelResult {
	ok: boolean;
	refreshError?: string;
}
