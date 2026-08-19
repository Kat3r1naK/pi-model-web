/**
 * cc-Switch 配置导入：读取 ~/.cc-switch/cc-switch.db（SQLite）中的 providers。
 * 安全约定：apiKey 只在服务端内部流转（扫描只返回脱敏元信息，
 * 导入在服务端直接从 DB 读 key 写入 models.json，不下发浏览器）。
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { HttpError } from "../lib/errors";
import { isObject } from "../lib/validate";
import { updateConfig } from "../config-store";
import type { JsonObject, ProviderConfig } from "../types";

const execFileAsync = promisify(execFile);
const DB_PATH = join(homedir(), ".cc-switch", "cc-switch.db");

/** 支持导入的 cc-Switch app_type（即弹窗中的两个分类） */
export const IMPORT_APP_TYPES = ["claude", "codex"] as const;
export type ImportAppType = (typeof IMPORT_APP_TYPES)[number];

export interface ImportCandidate {
	id: string;
	name: string;
	appType: ImportAppType;
	baseUrl?: string;
	/** 是否有可导入的 API Key（chatgpt OAuth 等无法迁移时为 false） */
	hasApiKey: boolean;
	/** codex 的 auth_mode，用于前端提示"不支持导入"的原因 */
	authMode?: string;
}

interface DbProviderRow {
	id?: unknown;
	name?: unknown;
	app_type?: unknown;
	settings_config?: unknown;
}

async function queryProviders(appType: ImportAppType): Promise<DbProviderRow[]> {
	if (!(IMPORT_APP_TYPES as readonly string[]).includes(appType)) {
		throw new HttpError(400, `不支持的配置类型: ${appType}`);
	}
	let stdout: string;
	try {
		// appType 已过白名单校验，可安全拼接（sqlite3 CLI 不支持参数绑定）
		const result = await execFileAsync(
			"sqlite3",
			["-json", DB_PATH, `SELECT id, name, app_type, settings_config FROM providers WHERE app_type = '${appType}'`],
			{ timeout: 5000, maxBuffer: 16 * 1024 * 1024 },
		);
		stdout = result.stdout;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("ENOENT")) throw new HttpError(503, "未找到 sqlite3 命令，无法读取 cc-Switch 数据库");
		throw new HttpError(503, `读取 cc-Switch 数据库失败：${message}`);
	}
	let rows: unknown;
	try {
		rows = JSON.parse(stdout || "[]");
	} catch {
		throw new HttpError(503, "cc-Switch 数据库查询结果无法解析");
	}
	if (!Array.isArray(rows)) return [];
	return rows.filter(isObject).filter((row) => row.app_type === appType) as DbProviderRow[];
}

function parseSettings(row: DbProviderRow): JsonObject {
	if (typeof row.settings_config !== "string") return {};
	try {
		const parsed: unknown = JSON.parse(row.settings_config);
		return isObject(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function envOf(settings: JsonObject): Record<string, string> {
	const env: Record<string, string> = {};
	if (isObject(settings.env)) {
		for (const [key, value] of Object.entries(settings.env)) {
			if (typeof value === "string") env[key] = value;
		}
	}
	return env;
}

/** codex 的 base_url 藏在 TOML 字符串里：base_url = "https://..." */
function parseCodexBaseUrl(settings: JsonObject): string | undefined {
	if (typeof settings.config !== "string") return undefined;
	const match = settings.config.match(/base_url\s*=\s*"([^"]+)"/);
	return match?.[1];
}

interface ExtractedConfig {
	baseUrl?: string;
	apiKey?: string;
	authMode?: string;
}

function extractConfig(appType: ImportAppType, settings: JsonObject): ExtractedConfig {
	if (appType === "claude") {
		const env = envOf(settings);
		return {
			baseUrl: env.ANTHROPIC_BASE_URL || undefined,
			apiKey: env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY || undefined,
		};
	}
	// codex：key 在 auth.OPENAI_API_KEY；chatgpt 登录态没有可迁移的 key
	const auth = isObject(settings.auth) ? settings.auth : {};
	const authMode = typeof auth.auth_mode === "string" ? auth.auth_mode : undefined;
	const apiKey = typeof auth.OPENAI_API_KEY === "string" && auth.OPENAI_API_KEY.length > 0
		? auth.OPENAI_API_KEY
		: undefined;
	return { baseUrl: parseCodexBaseUrl(settings), apiKey, authMode };
}

/** 扫描：返回脱敏候选列表（只含 hasApiKey 标志，不含 key 值） */
export async function scanCcSwitch(appType: ImportAppType): Promise<ImportCandidate[]> {
	const rows = await queryProviders(appType);
	return rows.map((row) => {
		const extracted = extractConfig(appType, parseSettings(row));
		return {
			id: typeof row.id === "string" ? row.id : "",
			name: typeof row.name === "string" ? row.name : "",
			appType,
			baseUrl: extracted.baseUrl,
			hasApiKey: Boolean(extracted.apiKey),
			authMode: extracted.authMode,
		};
	});
}

function slugify(name: string, fallback: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || fallback;
}

/** 导入：服务端直接读 key 写入 models.json，key 不经过浏览器 */
export async function importCcSwitch(appType: ImportAppType, ids: string[]): Promise<string[]> {
	if (ids.length === 0) throw new HttpError(400, "请至少选择一个配置");
	if (ids.length > 50) throw new HttpError(400, "单次最多导入 50 个配置");
	const rows = await queryProviders(appType);
	const selected = rows.filter((row) => typeof row.id === "string" && ids.includes(row.id));
	if (selected.length === 0) throw new HttpError(404, "所选配置不存在，请重新扫描");

	return updateConfig((config) => {
		const imported: string[] = [];
		for (const row of selected) {
			const name = typeof row.name === "string" ? row.name : "";
			const extracted = extractConfig(appType, parseSettings(row));
			if (!extracted.apiKey) continue;

			// 生成不冲突的 provider id：slug + 数字后缀
			const baseId = slugify(name, `${appType}-provider`);
			let id = baseId;
			let suffix = 2;
			while (config.providers[id]) {
				id = `${baseId}-${suffix}`;
				suffix += 1;
			}

			const provider: ProviderConfig = {
				name,
				apiKey: extracted.apiKey,
				models: [],
			};
			if (extracted.baseUrl) provider.baseUrl = extracted.baseUrl;
			if (appType === "claude") {
				provider.api = "anthropic-messages";
			} else {
				provider.api = "openai-codex-responses";
				provider.authHeader = true;
			}
			config.providers[id] = provider;
			imported.push(id);
		}
		if (imported.length === 0) throw new HttpError(400, "所选配置都没有可导入的 API Key");
		return imported;
	});
}
