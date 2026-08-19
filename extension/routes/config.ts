/** GET /api/config：读取配置（脱敏视图） */
import type { Context } from "koa";
import { CONFIG_PATH, readConfig } from "../config-store";
import { publicConfig } from "../lib/views";

export async function getConfigRoute(ctx: Context): Promise<void> {
	const config = await readConfig();
	ctx.body = publicConfig(config, CONFIG_PATH);
}
