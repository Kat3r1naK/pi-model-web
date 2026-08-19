/**
 * cc-Switch 配置导入：读取 ~/.cc-switch/cc-switch.db（SQLite）中的 providers。
 * 安全约定：apiKey 只在服务端内部流转（扫描只返回脱敏元信息，
 * 导入在服务端直接从 DB 读 key 写入 models.json，不下发浏览器）。
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { HttpError } from "../lib/errors";
import { isObject } from "../lib/validate";
import { updateConfig } from "../config-store";
import type { JsonObject, ProviderConfig } from "../types";

const execFileAsync = promisify(execFile);
const DB_PATH = join(homedir(), ".cc-switch", "cc-switch.db");
/** codex 模型目录：cc-Switch 切换 codex provider 时写入 */
const CODEX_CATALOG_PATH = join(homedir(), ".codex", "cc-switch-model-catalog.json");

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
	/** 导入时会一并带入的模型数量（0 = 无模型数据） */
	modelCount: number;
}

interface DbProviderRow {
	id?: unknown;
	name?: unknown;
	app_type?: unknown;
	settings_config?: unknown;
}

/* ---------- 模型数据源：model_pricing 定价表 + codex 模型目录 ---------- */

interface PricingRow {
	model_id: string;
	display_name: string;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
}

async function queryPricing(): Promise<PricingRow[]> {
	let stdout: string;
	try {
		const result = await execFileAsync(
			"sqlite3",
			[
				"-json",
				DB_PATH,
				"SELECT model_id, display_name, input_cost_per_million AS input, output_cost_per_million AS output, cache_read_cost_per_million AS cacheRead, cache_creation_cost_per_million AS cacheWrite FROM model_pricing",
			],
			{ timeout: 5000, maxBuffer: 16 * 1024 * 1024 },
		);
		stdout = result.stdout;
	} catch {
		return [];
	}
	try {
		const rows: unknown = JSON.parse(stdout || "[]");
		if (!Array.isArray(rows)) return [];
		return rows.filter(isObject).map((row) => ({
			model_id: String(row.model_id ?? ""),
			display_name: String(row.display_name ?? ""),
			input: Number(row.input) || 0,
			output: Number(row.output) || 0,
			cacheRead: Number(row.cacheRead) || 0,
			cacheWrite: Number(row.cacheWrite) || 0,
		}));
	} catch {
		return [];
	}
}

interface CodexCatalogModel {
	slug: string;
	display_name?: string;
	context_window?: number;
	max_context_window?: number;
	input_modalities?: unknown;
	supported_reasoning_levels?: unknown;
}

/** 读取 codex 模型目录（cc-Switch 切换 codex provider 时写入） */
async function loadCodexCatalog(): Promise<CodexCatalogModel[]> {
	try {
		const text = await readFile(CODEX_CATALOG_PATH, "utf8");
		const parsed: unknown = JSON.parse(text);
		const models = isObject(parsed) ? parsed.models : undefined;
		if (!Array.isArray(models)) return [];
		return models.filter(isObject).map((m) => ({
			slug: String(m.slug ?? ""),
			display_name: typeof m.display_name === "string" ? m.display_name : undefined,
			context_window: typeof m.context_window === "number" ? m.context_window : undefined,
			max_context_window: typeof m.max_context_window === "number" ? m.max_context_window : undefined,
			input_modalities: m.input_modalities,
			supported_reasoning_levels: m.supported_reasoning_levels,
		}));
	} catch {
		return [];
	}
}

function pricingMapOf(pricing: PricingRow[]): Map<string, PricingRow> {
	return new Map(pricing.map((row) => [row.model_id, row]));
}

function modelWithCost(id: string, name: string, reasoning: boolean, input: string[], contextWindow: number, price?: PricingRow): JsonObject {
	return {
		id,
		name,
		reasoning,
		input,
		contextWindow,
		maxTokens: 16_384,
		cost: {
			input: price?.input ?? 0,
			output: price?.output ?? 0,
			cacheRead: price?.cacheRead ?? 0,
			cacheWrite: price?.cacheWrite ?? 0,
		},
	};
}

/** claude provider 实际使用的模型藏在 settings.env 的 ANTHROPIC_*_MODEL 变量里（*_NAME 是对应显示名） */
const CLAUDE_MODEL_ENV_KEYS = [
	"ANTHROPIC_MODEL",
	"ANTHROPIC_DEFAULT_HAIKU_MODEL",
	"ANTHROPIC_DEFAULT_SONNET_MODEL",
	"ANTHROPIC_DEFAULT_OPUS_MODEL",
	"ANTHROPIC_DEFAULT_FABLE_MODEL",
	"ANTHROPIC_REASONING_MODEL",
] as const;

function claudeModelsFromSettings(settings: JsonObject, pricingById: Map<string, PricingRow>): JsonObject[] {
	const env = envOf(settings);
	const models: JsonObject[] = [];
	const seen = new Set<string>();
	for (const key of CLAUDE_MODEL_ENV_KEYS) {
		const raw = env[key];
		if (!raw) continue;
		// cc-Switch 用 [1m] / [1M] 等后缀标记长上下文，API 实际模型 id 不含该标记
		const longContext = /\[[0-9]+m\]$/i.test(raw);
		const id = raw.replace(/\[[0-9]+[mk]\]$/i, "");
		if (!id || seen.has(id)) continue;
		seen.add(id);
		const displayName = env[`${key}_NAME`];
		models.push(
			modelWithCost(
				id,
				typeof displayName === "string" && displayName ? displayName : id,
				!/claude-3/.test(id),
				["text"],
				longContext ? 1_000_000 : 200_000,
				pricingById.get(id),
			),
		);
	}
	return models;
}

/** codex provider 的默认模型写在 config.toml 顶层的 model = "..."（元数据从模型目录补充） */
function codexModelsFromSettings(
	settings: JsonObject,
	pricingById: Map<string, PricingRow>,
	codexCatalog: CodexCatalogModel[],
): JsonObject[] {
	if (typeof settings.config !== "string") return [];
	const match = settings.config.match(/^\s*model\s*=\s*"([^"]+)"/m);
	const slug = match?.[1];
	if (!slug) return [];
	const entry = codexCatalog.find((item) => item.slug === slug);
	const modalities = Array.isArray(entry?.input_modalities)
		? entry.input_modalities.filter((item): item is string => typeof item === "string")
		: [];
	return [
		modelWithCost(
			slug,
			entry?.display_name || slug,
			true,
			modalities.includes("image") ? ["text", "image"] : ["text"],
			entry?.context_window ?? entry?.max_context_window ?? 128_000,
			pricingById.get(slug),
		),
	];
}

/** 组装单个 provider 的 models 数组：claude 取 env 中的模型变量，codex 取 config.toml 的默认模型（价格统一从定价表补充） */
function buildModelsForProvider(
	appType: ImportAppType,
	settings: JsonObject,
	pricing: PricingRow[],
	codexCatalog: CodexCatalogModel[],
): JsonObject[] {
	const pricingById = pricingMapOf(pricing);
	return appType === "claude"
		? claudeModelsFromSettings(settings, pricingById)
		: codexModelsFromSettings(settings, pricingById, codexCatalog);
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

/** 扫描：返回脱敏候选列表（只含 hasApiKey 标志，不含 key 值），并按各配置自带的模型设置预估导入模型数 */
export async function scanCcSwitch(appType: ImportAppType): Promise<ImportCandidate[]> {
	const rows = await queryProviders(appType);
	const [pricing, codexCatalog] = await Promise.all([queryPricing(), loadCodexCatalog()]);
	return rows.map((row) => {
		const settings = parseSettings(row);
		const extracted = extractConfig(appType, settings);
		return {
			id: typeof row.id === "string" ? row.id : "",
			name: typeof row.name === "string" ? row.name : "",
			appType,
			baseUrl: extracted.baseUrl,
			hasApiKey: Boolean(extracted.apiKey),
			authMode: extracted.authMode,
			modelCount: buildModelsForProvider(appType, settings, pricing, codexCatalog).length,
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

/** 导入：服务端直接读 key 写入 models.json（key 不经过浏览器），并附带模型列表 */
export async function importCcSwitch(
	appType: ImportAppType,
	ids: string[],
): Promise<{ ids: string[]; modelCount: number }> {
	if (ids.length === 0) throw new HttpError(400, "请至少选择一个配置");
	if (ids.length > 50) throw new HttpError(400, "单次最多导入 50 个配置");
	const rows = await queryProviders(appType);
	const selected = rows.filter((row) => typeof row.id === "string" && ids.includes(row.id));
	if (selected.length === 0) throw new HttpError(404, "所选配置不存在，请重新扫描");
	const [pricing, codexCatalog] = await Promise.all([queryPricing(), loadCodexCatalog()]);

	let totalModelCount = 0;
	const imported = await updateConfig((config) => {
		const importedIds: string[] = [];
		for (const row of selected) {
			const name = typeof row.name === "string" ? row.name : "";
			const settings = parseSettings(row);
			const extracted = extractConfig(appType, settings);
			if (!extracted.apiKey) continue;
			const models = buildModelsForProvider(appType, settings, pricing, codexCatalog);

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
				// 每个 provider 拷贝独立的 models 数组，避免后续编辑互相影响
				models: models.map((model) => ({ ...model })),
			};
			totalModelCount += models.length;
			if (extracted.baseUrl) provider.baseUrl = extracted.baseUrl;
			if (appType === "claude") {
				provider.api = "anthropic-messages";
			} else {
				// codex 只能经 OPENAI_API_KEY 导入（普通 key）；openai-codex-responses
				// 仅支持 ChatGPT OAuth JWT（会抛 Failed to extract accountId from token），
				// Responses 协议走 openai-responses 即可
				provider.api = "openai-responses";
				provider.authHeader = true;
			}
			config.providers[id] = provider;
			importedIds.push(id);
		}
		if (importedIds.length === 0) throw new HttpError(400, "所选配置都没有可导入的 API Key");
		return importedIds;
	});
	return { ids: imported, modelCount: totalModelCount };
}
