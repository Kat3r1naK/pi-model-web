/** model 相关路由：POST /api/model、POST /api/model/delete */
import type { Context } from "koa";
import { getBody } from "../middleware/body-parser";
import { deleteModel, saveModel } from "../services/model";
import { refreshAfterChange, type RouteDeps } from "./context";

export async function saveModelRoute(ctx: Context, deps: RouteDeps): Promise<void> {
	const result = await saveModel(getBody(ctx));
	const refreshError = await refreshAfterChange(deps.refreshModels);
	ctx.body = { ok: true, ...result, refreshError };
}

export async function deleteModelRoute(ctx: Context, deps: RouteDeps): Promise<void> {
	await deleteModel(getBody(ctx));
	const refreshError = await refreshAfterChange(deps.refreshModels);
	ctx.body = { ok: true, refreshError };
}
