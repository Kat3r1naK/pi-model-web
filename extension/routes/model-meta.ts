/** GET /api/model/meta?id=xxx：查 pi 内置模型注册表的官方参数，供新建模型时自动回填 */
import type { Context } from "koa";
import { HttpError } from "../lib/errors";
import type { RouteDeps } from "./context";

export function getModelMetaRoute(ctx: Context, deps: RouteDeps): void {
	const id = typeof ctx.query.id === "string" ? ctx.query.id.trim() : "";
	if (!id) throw new HttpError(400, "id 不能为空");
	const meta = deps.getModelMeta?.(id);
	// 未命中不算错误：中转站自定义模型本来就不在注册表里，前端手动填写即可
	ctx.body = { found: Boolean(meta), meta: meta ?? null };
}
