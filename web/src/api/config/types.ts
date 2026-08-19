/**
 * GET /api/config 相关类型。
 * ProviderInfo / ModelInfo 是 models.json 的数据实体视图（已脱敏），
 * 也是其他接口类型的引用来源。
 */

export const API_TYPES = [
	"openai-completions",
	"openai-responses",
	"anthropic-messages",
	"google-generative-ai",
	"google-vertex",
	"azure-openai-responses",
	"openai-codex-responses",
	"mistral-conversations",
	"bedrock-converse-stream",
	"pi-messages",
] as const;

export type ApiType = (typeof API_TYPES)[number];

export interface CostTier {
	inputTokensAbove: number;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
}

export interface CostConfig {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	tiers: CostTier[];
}

/** 模型视图（已脱敏，敏感值只有布尔标志） */
export interface ModelInfo {
	id: string;
	name: string;
	api: string;
	baseUrl: string;
	reasoning: boolean;
	thinkingLevelMap: Record<string, string | null>;
	input: Array<"text" | "image">;
	contextWindow: number;
	maxTokens: number;
	samplingParams: Record<string, number>;
	compat: Record<string, unknown>;
	headersSet: boolean;
	cost: CostConfig;
}

/** provider 视图（已脱敏） */
export interface ProviderInfo {
	id: string;
	name: string;
	baseUrl: string;
	api: string;
	oauth: "radius" | "";
	authHeader: boolean;
	apiKeySet: boolean;
	headersSet: boolean;
	compat: Record<string, unknown>;
	modelOverrides: Record<string, Record<string, unknown>>;
	models: ModelInfo[];
}

/** GET /api/config 响应 */
export interface ConfigResponse {
	file: string;
	providers: ProviderInfo[];
}
