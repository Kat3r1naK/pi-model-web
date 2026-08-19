/** 安全响应头：禁止缓存、禁止 MIME 嗅探 */
import type { Middleware } from "koa";

export function securityHeaders(): Middleware {
	return async (ctx, next) => {
		ctx.set("cache-control", "no-store");
		ctx.set("x-content-type-options", "nosniff");
		await next();
	};
}
