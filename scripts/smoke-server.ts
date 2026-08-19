/**
 * Koa 服务冒烟测试：直接起服务打真实接口（只读，不改 models.json）。
 * 运行：node scripts/smoke-server.ts
 */
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createApp } from "../extension/server";

const token = randomBytes(12).toString("hex");
const app = createApp({ token, refreshModels: async () => {} });
const server = createServer(app.callback());

await new Promise<void>((resolve) => {
	server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("无法获取端口");
const base = `http://127.0.0.1:${address.port}`;

async function probe(name: string, path: string, headers: Record<string, string> = {}) {
	const response = await fetch(base + path, { headers });
	const text = await response.text();
	console.log(`[${name}] ${response.status} ${text.slice(0, 100).replace(/\s+/g, " ")}`);
}

async function probePost(name: string, path: string, body: unknown, headers: Record<string, string> = {}) {
	const response = await fetch(base + path, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
	const text = await response.text();
	console.log(`[${name}] ${response.status} ${text.slice(0, 100).replace(/\s+/g, " ")}`);
}

await probe("无 token 应 401", "/api/config");
await probe("带 token 读配置", "/api/config", { "x-model-web-token": token });
await probe("页面", "/?token=" + token);
await probe("未命中应 404", "/nope", { "x-model-web-token": token });
await probePost("POST 无 token 应 401", "/api/provider", {});
await probePost("空 body 应 400（校验拦截，不落盘）", "/api/provider", {}, { "x-model-web-token": token });

server.close();
console.log("smoke test done");
