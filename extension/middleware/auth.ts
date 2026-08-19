/** token 鉴权：请求头 X-Model-Web-Token、URL query token 或会话 Cookie 任一匹配即放行。
 * /assets/ 静态资源豁免：浏览器 <script>/<link> 标签无法携带自定义头，
 * 且文件名含内容 hash、仅本机监听，公开访问无敏感性。
 * 首次带 token 访问页面时下发 HttpOnly 会话 Cookie，之后地址栏不再需要 token。 */
import type { Middleware } from "koa";

const SESSION_COOKIE = "model_web_session";

function cookieToken(cookieHeader: string | undefined): string | undefined {
	if (!cookieHeader) return undefined;
	for (const part of cookieHeader.split(";")) {
		const [key, ...rest] = part.trim().split("=");
		if (key === SESSION_COOKIE) return rest.join("=");
	}
	return undefined;
}

export function auth(token: string): Middleware {
	return async (ctx, next) => {
		if (ctx.path.startsWith("/assets/")) {
			await next();
			return;
		}
		const header = ctx.headers["x-model-web-token"];
		const fromCookie = cookieToken(ctx.headers.cookie);
		const authorized = header === token || ctx.query.token === token || fromCookie === token;
		if (!authorized) {
			ctx.status = 401;
			ctx.body = { error: "未授权" };
			return;
		}
		// 首次带 token 打开页面：写入会话 Cookie（SameSite=Strict 防 CSRF），
		// 前端随后会把 URL 里的 token 参数移除
		const isPage = ctx.path === "/" || ctx.path === "/index.html";
		if (isPage && fromCookie !== token) {
			ctx.cookies.set(SESSION_COOKIE, token, {
				httpOnly: true,
				sameSite: "strict",
				overwrite: true,
			});
		}
		await next();
	};
}
