/** Koa 应用组装：中间件顺序 = 错误兜底 → 安全头 → 鉴权 → 请求体解析 → 路由 */
import Koa from "koa";
import { auth } from "./middleware/auth";
import { bodyParser } from "./middleware/body-parser";
import { errorHandler } from "./middleware/error-handler";
import { securityHeaders } from "./middleware/security-headers";
import { router } from "./routes";
import type { GetModelMeta, RefreshModels } from "./types";

export interface AppDeps {
	token: string;
	refreshModels: RefreshModels;
	/** 按模型 id 查 pi 内置注册表元数据（导入时校正上下文/输出 token） */
	getModelMeta?: GetModelMeta;
}

export function createApp(deps: AppDeps): Koa {
	const app = new Koa();
	app.use(errorHandler());
	app.use(securityHeaders());
	app.use(auth(deps.token));
	app.use(bodyParser());
	app.use(router({ refreshModels: deps.refreshModels, getModelMeta: deps.getModelMeta }));
	return app;
}
