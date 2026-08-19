/** GET / 、GET /index.html：返回前端构建产物（单文件 HTML） */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "koa";
import { isObject } from "../lib/validate";

const INDEX_HTML_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.html");

export async function getPage(ctx: Context): Promise<void> {
	let html: string;
	try {
		html = await readFile(INDEX_HTML_PATH, "utf8");
	} catch (error) {
		const code = isObject(error) ? error.code : undefined;
		if (code === "ENOENT") {
			ctx.status = 503;
			ctx.body = { error: "前端构建产物不存在，请先在 web/ 目录执行 pnpm build" };
			return;
		}
		throw error;
	}
	ctx.type = "text/html; charset=utf-8";
	ctx.set(
		"content-security-policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
	);
	ctx.body = html;
}
