/** 路由表与分发：method + path 精确匹配，未命中返回 404 */
import type { Context, Middleware } from "koa";
import { getAsset } from "./assets";
import { getConfigRoute } from "./config";
import type { RouteDeps } from "./context";
import { importCcSwitchRoute, scanCcSwitchRoute } from "./import";
import { deleteModelRoute, saveModelRoute } from "./model";
import { getPage } from "./page";
import { deleteProviderRoute, saveProviderRoute } from "./provider";

type RouteHandler = (ctx: Context, deps: RouteDeps) => Promise<void> | void;

interface Route {
	method: "GET" | "POST";
	path: string;
	handler: RouteHandler;
}

const ROUTES: Route[] = [
	{ method: "GET", path: "/", handler: getPage },
	{ method: "GET", path: "/index.html", handler: getPage },
	{ method: "GET", path: "/api/config", handler: getConfigRoute },
	{ method: "POST", path: "/api/provider", handler: saveProviderRoute },
	{ method: "POST", path: "/api/provider/delete", handler: deleteProviderRoute },
	{ method: "POST", path: "/api/model", handler: saveModelRoute },
	{ method: "POST", path: "/api/model/delete", handler: deleteModelRoute },
	{ method: "GET", path: "/api/import/cc-switch", handler: scanCcSwitchRoute },
	{ method: "POST", path: "/api/import/cc-switch", handler: importCcSwitchRoute },
];

export function router(deps: RouteDeps): Middleware {
	return async (ctx) => {
		if (ctx.method === "GET" && ctx.path.startsWith("/assets/")) {
			await getAsset(ctx);
			return;
		}
		const route = ROUTES.find((item) => item.method === ctx.method && item.path === ctx.path);
		if (!route) {
			ctx.status = 404;
			ctx.body = { error: "Not found" };
			return;
		}
		await route.handler(ctx, deps);
	};
}
