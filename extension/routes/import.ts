/** cc-Switch 导入路由：GET /api/import/cc-switch、POST /api/import/cc-switch */
import type { Context } from "koa";
import { HttpError } from "../lib/errors";
import { getBody } from "../middleware/body-parser";
import {
	IMPORT_APP_TYPES,
	importCcSwitch,
	scanCcSwitch,
	type ImportAppType,
} from "../services/cc-switch-import";
import { refreshAfterChange, type RouteDeps } from "./context";

function parseAppType(value: unknown): ImportAppType {
	if (typeof value === "string" && (IMPORT_APP_TYPES as readonly string[]).includes(value)) {
		return value as ImportAppType;
	}
	throw new HttpError(400, "appType 必须是 claude 或 codex");
}

/** GET /api/import/cc-switch?appType=claude|codex：扫描候选配置（脱敏） */
export async function scanCcSwitchRoute(ctx: Context): Promise<void> {
	const appType = parseAppType(ctx.query.appType);
	const candidates = await scanCcSwitch(appType);
	ctx.body = { appType, candidates };
}

/** POST /api/import/cc-switch：导入勾选的配置（key 在服务端直接写入，不下发） */
export async function importCcSwitchRoute(ctx: Context, deps: RouteDeps): Promise<void> {
	const body = getBody(ctx);
	const appType = parseAppType(body.appType);
	const ids = Array.isArray(body.ids) ? body.ids.filter((item): item is string => typeof item === "string") : [];
	const imported = await importCcSwitch(appType, ids);
	const refreshError = await refreshAfterChange(deps.refreshModels);
	ctx.body = { ok: true, imported, refreshError };
}
