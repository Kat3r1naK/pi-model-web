/** provider 相关路由：POST /api/provider、POST /api/provider/delete */
import type { Context } from "koa";
import { getBody } from "../middleware/body-parser";
import { deleteProvider, saveProvider } from "../services/provider";
import { refreshAfterChange, type RouteDeps } from "./context";

export async function saveProviderRoute(ctx: Context, deps: RouteDeps): Promise<void> {
	const id = await saveProvider(getBody(ctx));
	const refreshError = await refreshAfterChange(deps.refreshModels);
	ctx.body = { ok: true, id, refreshError };
}

export async function deleteProviderRoute(ctx: Context, deps: RouteDeps): Promise<void> {
	await deleteProvider(getBody(ctx));
	const refreshError = await refreshAfterChange(deps.refreshModels);
	ctx.body = { ok: true, refreshError };
}
