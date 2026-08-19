/** 统一错误处理：HttpError 带状态码返回 JSON，其余视为 500 并打日志 */
import type { Middleware } from "koa";
import { HttpError } from "../lib/errors";

export function errorHandler(): Middleware {
	return async (ctx, next) => {
		try {
			await next();
		} catch (error) {
			const status = error instanceof HttpError ? error.status : 500;
			const message = error instanceof Error ? error.message : String(error);
			if (status >= 500) console.error(`[model-web] ${message}`);
			ctx.status = status;
			ctx.body = { error: message };
		}
	};
}
