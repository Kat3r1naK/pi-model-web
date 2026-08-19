/** POST 请求体解析：限制 256KB，必须是 JSON 对象，结果挂在 ctx.state.body */
import type { IncomingMessage } from "node:http";
import type { Context, Middleware } from "koa";
import { HttpError } from "../lib/errors";
import { isObject } from "../lib/validate";
import type { JsonObject } from "../types";

const MAX_BODY_BYTES = 256 * 1024;

function readJsonObject(req: IncomingMessage): Promise<JsonObject> {
	return new Promise((resolve, reject) => {
		let total = 0;
		let data = "";
		req.setEncoding("utf8");
		req.on("data", (chunk: string) => {
			total += Buffer.byteLength(chunk);
			if (total > MAX_BODY_BYTES) {
				req.destroy();
				reject(new HttpError(413, "请求内容太大"));
				return;
			}
			data += chunk;
		});
		req.on("end", () => {
			try {
				const parsed: unknown = JSON.parse(data || "{}");
				if (!isObject(parsed)) throw new HttpError(400, "请求 body 必须是 JSON 对象");
				resolve(parsed);
			} catch (error) {
				reject(error instanceof HttpError ? error : new HttpError(400, "请求 body JSON 格式错误"));
			}
		});
		req.on("error", reject);
	});
}

export function bodyParser(): Middleware {
	return async (ctx, next) => {
		if (ctx.method === "POST") {
			ctx.state.body = await readJsonObject(ctx.req);
		}
		await next();
	};
}

export function getBody(ctx: Context): JsonObject {
	return (ctx.state.body ?? {}) as JsonObject;
}
