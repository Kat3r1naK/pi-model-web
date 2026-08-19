/**
 * GET /assets/*：托管前端构建产物中的静态资源。
 * 文件名带内容 hash（Vite 产物），因此可长缓存；路径规范化后防目录穿越。
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "koa";

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "assets");

const MIME_TYPES: Record<string, string> = {
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".woff2": "font/woff2",
};

export async function getAsset(ctx: Context): Promise<void> {
	const relative = normalize(ctx.path.slice("/assets/".length));
	if (!relative || relative.startsWith("..") || relative.startsWith("/")) {
		ctx.status = 404;
		ctx.body = { error: "Not found" };
		return;
	}
	const filePath = join(ASSETS_DIR, relative);
	try {
		const info = await stat(filePath);
		if (!info.isFile()) throw new Error("not a file");
	} catch {
		ctx.status = 404;
		ctx.body = { error: "Not found" };
		return;
	}
	const type = MIME_TYPES[extname(filePath)];
	if (!type) {
		ctx.status = 404;
		ctx.body = { error: "Not found" };
		return;
	}
	ctx.type = type;
	// hash 文件名保证内容不变，可永久缓存（覆盖 security-headers 的 no-store）
	ctx.set("cache-control", "public, max-age=31536000, immutable");
	ctx.body = createReadStream(filePath);
}
