/**
 * 本地预览：启动真实 Koa 扩展服务（读写真实 models.json，注意勿乱删），
 * 用于浏览器验证前端页面。Ctrl+C 退出。
 * 运行：pnpm --dir extension exec tsx ../scripts/preview-server.ts
 */
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createApp } from "../extension/server";

const token = randomBytes(12).toString("hex");
const app = createApp({ token, refreshModels: async () => {} });
const server = createServer(app.callback());
const port = Number(process.env.PORT ?? 4879);

server.listen(port, "127.0.0.1", () => {
	console.log(`preview: http://127.0.0.1:${port}/?token=${token}`);
});
