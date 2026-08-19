/**
 * models.json 存储层：读取（兼容 JSONC 注释）、原子写入、串行更新队列。
 * 所有写操作经 updateConfig 串行执行，"读 → 改 → 写"互斥，避免并发覆盖。
 */
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { stripJsonComments } from "./lib/jsonc";
import { isObject } from "./lib/validate";
import type { ModelsConfig } from "./types";

export const CONFIG_PATH = join(getAgentDir(), "models.json");

function normalizeConfig(value: unknown): ModelsConfig {
	if (!isObject(value)) throw new Error("models.json 必须是 JSON 对象");
	if (value.providers === undefined) value.providers = {};
	if (!isObject(value.providers)) throw new Error("models.json 的 providers 必须是对象");
	for (const [providerId, provider] of Object.entries(value.providers)) {
		if (!isObject(provider)) throw new Error(`provider ${providerId} 必须是对象`);
	}
	return value as ModelsConfig;
}

export async function readConfig(): Promise<ModelsConfig> {
	try {
		const text = await readFile(CONFIG_PATH, "utf8");
		return normalizeConfig(JSON.parse(stripJsonComments(text)));
	} catch (error) {
		const code = isObject(error) ? error.code : undefined;
		if (code === "ENOENT") return { providers: {} };
		if (error instanceof SyntaxError) throw new Error(`无法解析 ${CONFIG_PATH}: JSON 格式错误`);
		throw error;
	}
}

/** 原子写：先写临时文件再 rename，避免写一半损坏配置；权限固定 0600 */
async function writeConfig(config: ModelsConfig): Promise<void> {
	await mkdir(join(CONFIG_PATH, ".."), { recursive: true });
	const tempPath = `${CONFIG_PATH}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
	await writeFile(tempPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
	await rename(tempPath, CONFIG_PATH);
	await chmod(CONFIG_PATH, 0o600);
}

let writeQueue: Promise<void> = Promise.resolve();

export async function updateConfig<T>(mutator: (config: ModelsConfig) => T): Promise<T> {
	let result!: T;
	const operation = writeQueue.then(async () => {
		const config = await readConfig();
		result = mutator(config);
		await writeConfig(config);
	});
	writeQueue = operation.then(
		() => undefined,
		() => undefined,
	);
	await operation;
	return result;
}
