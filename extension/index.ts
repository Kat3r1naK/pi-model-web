/**
 * pi 扩展入口：注册 /model-web 命令。
 * 执行时在 pi 进程内启动 Koa 服务（127.0.0.1 随机端口 + 一次性 token），
 * 自动打开浏览器；会话结束时关闭服务。
 *
 * HTTP 层见 server.ts / routes/ / middleware/，业务逻辑见 services/。
 */
import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { createApp } from "./server";

async function openBrowser(pi: ExtensionAPI, url: string): Promise<void> {
	const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
	const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
	const result = await pi.exec(command, args, { timeout: 5_000 });
	if (result.code !== 0) throw new Error(result.stderr || `无法执行 ${command}`);
}

async function startServer(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<{ server: Server; url: string }> {
	const token = randomBytes(24).toString("hex");
	// 从 pi 内置模型注册表抓官方参数，供 cc-switch 导入 / 新建模型校正；
	// 同 id 多 provider 时首个命中优先，官方值一致不影响结果
	const metaById = new Map<string, { contextWindow?: number; maxTokens?: number; reasoning?: boolean; thinkingLevelMap?: Record<string, string | null> }>();
	for (const model of ctx.modelRegistry.getAll()) {
		if (metaById.has(model.id)) continue;
		metaById.set(model.id, {
			contextWindow: model.contextWindow,
			maxTokens: model.maxTokens,
			reasoning: model.reasoning,
			thinkingLevelMap: model.thinkingLevelMap ? { ...model.thinkingLevelMap } : undefined,
		});
	}
	const app = createApp({
		token,
		refreshModels: () => ctx.modelRegistry.refresh(),
		getModelMeta: (id) => metaById.get(id),
	});
	const server = createServer(app.callback());
	await new Promise<void>((resolve, reject) => {
		const onError = (error: Error) => {
			server.off("listening", onListening);
			reject(error);
		};
		const onListening = () => {
			server.off("error", onError);
			resolve();
		};
		server.once("error", onError);
		server.once("listening", onListening);
		server.listen(0, "127.0.0.1");
	});
	const address = server.address();
	if (!address || typeof address === "string") {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		throw new Error("无法获取 Web 服务端口");
	}
	return { server, url: `http://127.0.0.1:${address.port}/?token=${token}` };
}

export default function modelWebExtension(pi: ExtensionAPI): void {
	let activeServer: Server | undefined;

	const stopServer = async (): Promise<void> => {
		if (!activeServer) return;
		const server = activeServer;
		activeServer = undefined;
		if (server.listening) {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	};

	pi.registerCommand("model-web", {
		description: "Open a local Web UI to add and manage providers and models",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/model-web 需要 TUI 或 RPC UI 模式", "error");
				return;
			}
			if (activeServer?.listening) {
				ctx.ui.notify("Model Web UI 已经运行，请查看已打开的浏览器窗口。", "info");
				return;
			}

			try {
				const started = await startServer(pi, ctx);
				activeServer = started.server;
				ctx.ui.notify(`Model Web UI 已启动：${started.url}`, "info");
				try {
					await openBrowser(pi, started.url);
				} catch (error) {
					ctx.ui.notify(
						`浏览器自动打开失败，请手动访问：${started.url}\n${error instanceof Error ? error.message : String(error)}`,
						"warning",
					);
				}
			} catch (error) {
				ctx.ui.notify(`启动 Model Web UI 失败：${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.on("session_shutdown", async () => {
		await stopServer();
	});
}
