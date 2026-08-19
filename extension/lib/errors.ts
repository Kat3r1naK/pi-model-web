/** HTTP 业务错误：携带状态码，由 error-handler 中间件统一转成 JSON 响应 */
export class HttpError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}
