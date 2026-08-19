/** POST /api/model 入参与返回值 */

import type { CostTier } from "../config/types";

/**
 * 请求体。
 * 语义：字段留空 = 保留原值；显式删除需勾选对应 clearXxx。
 */
export interface SaveModelPayload {
	provider: string;
	id: string;
	originalId?: string;
	name?: string;
	api?: string;
	baseUrl?: string;
	reasoning?: boolean;
	input?: Array<"text" | "image">;
	contextWindow?: number;
	maxTokens?: number;
	thinkingLevelMap?: Record<string, string | null>;
	samplingParams?: Record<string, number>;
	headers?: Record<string, string>;
	compatJson?: string;
	cost?: {
		input?: number;
		output?: number;
		cacheRead?: number;
		cacheWrite?: number;
	};
	costTiers?: CostTier[];
	clearApi?: boolean;
	clearBaseUrl?: boolean;
	clearThinkingLevelMap?: boolean;
	clearSamplingParams?: boolean;
	clearHeaders?: boolean;
	clearCompat?: boolean;
	clearCostTiers?: boolean;
}

/** 响应 */
export interface SaveModelResult {
	ok: boolean;
	provider: string;
	id: string;
	refreshError?: string;
}
