/**
 * 配置脱敏视图：下发给浏览器的数据。
 * apiKey 和 headers 的值永不返回，只保留"是否已设置"的布尔标志。
 */
import type { JsonObject, ModelsConfig } from "../types";
import { isObject } from "./validate";

function readCost(model: JsonObject): JsonObject {
	return isObject(model.cost) ? model.cost : {};
}

/** 掩码 key：前 8 后 4，中间省略号；过短则只显示前 4，不泄露完整值 */
function maskApiKey(key: string): string {
	if (key.length <= 12) return `${key.slice(0, 4)}…`;
	return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

function safeAdvancedObject(value: unknown): JsonObject {
	if (!isObject(value)) return {};
	return { ...value };
}

function safeModelOverrides(value: unknown): JsonObject {
	if (!isObject(value)) return {};
	const result: JsonObject = {};
	for (const [modelId, override] of Object.entries(value)) {
		if (!isObject(override)) continue;
		const safeOverride = { ...override };
		delete safeOverride.headers;
		result[modelId] = safeOverride;
	}
	return result;
}

function safeModel(model: JsonObject): JsonObject {
	const cost = readCost(model);
	const input = Array.isArray(model.input)
		? model.input.filter((item): item is "text" | "image" => item === "text" || item === "image")
		: ["text"];
	return {
		id: typeof model.id === "string" ? model.id : "",
		name: typeof model.name === "string" ? model.name : "",
		api: typeof model.api === "string" ? model.api : "",
		baseUrl: typeof model.baseUrl === "string" ? model.baseUrl : "",
		reasoning: model.reasoning === true,
		thinkingLevelMap: safeAdvancedObject(model.thinkingLevelMap),
		input: input.length > 0 ? input : ["text"],
		contextWindow: typeof model.contextWindow === "number" ? model.contextWindow : 128_000,
		maxTokens: typeof model.maxTokens === "number" ? model.maxTokens : 16_384,
		samplingParams: safeAdvancedObject(model.samplingParams),
		compat: safeAdvancedObject(model.compat),
		headersSet: isObject(model.headers) && Object.keys(model.headers).length > 0,
		cost: {
			input: typeof cost.input === "number" ? cost.input : 0,
			output: typeof cost.output === "number" ? cost.output : 0,
			cacheRead: typeof cost.cacheRead === "number" ? cost.cacheRead : 0,
			cacheWrite: typeof cost.cacheWrite === "number" ? cost.cacheWrite : 0,
			tiers: Array.isArray(cost.tiers) ? cost.tiers : [],
		},
	};
}

export function publicConfig(config: ModelsConfig, filePath: string): JsonObject {
	const providers = Object.entries(config.providers).map(([id, provider]) => {
		const models = Array.isArray(provider.models) ? provider.models.filter(isObject).map(safeModel) : [];
		return {
			id,
			name: typeof provider.name === "string" ? provider.name : "",
			baseUrl: typeof provider.baseUrl === "string" ? provider.baseUrl : "",
			api: typeof provider.api === "string" ? provider.api : "openai-completions",
			oauth: provider.oauth === "radius" ? "radius" : "",
			authHeader: provider.authHeader === true,
			apiKeySet: typeof provider.apiKey === "string" && provider.apiKey.length > 0,
			apiKeyMasked:
				typeof provider.apiKey === "string" && provider.apiKey.length > 0
					? maskApiKey(provider.apiKey)
					: "",
			headersSet: isObject(provider.headers) && Object.keys(provider.headers).length > 0,
			compat: safeAdvancedObject(provider.compat),
			modelOverrides: safeModelOverrides(provider.modelOverrides),
			models,
		};
	});
	return { file: filePath, providers };
}
