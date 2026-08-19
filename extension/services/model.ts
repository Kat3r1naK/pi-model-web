/** model 业务逻辑：校验请求体 → 构建 model 对象 → 串行更新 models.json */
import { updateConfig } from "../config-store";
import { validateOptionalApi } from "../lib/api-types";
import { HttpError } from "../lib/errors";
import {
	asBoolean,
	asNonNegativeNumber,
	asOptionalString,
	asPositiveInteger,
	getArrayField,
	getBodyString,
	getObjectField,
	isObject,
	mergeObjectField,
	parseHeaders,
	setOrDeleteField,
	validateIdentifier,
} from "../lib/validate";
import type { JsonObject } from "../types";

function readCost(model: JsonObject): JsonObject {
	return isObject(model.cost) ? model.cost : {};
}

function buildModel(body: JsonObject, existing: JsonObject | undefined): JsonObject {
	const id = getBodyString(body, "id", 300);
	const name = asOptionalString(body.name, "name", 300);
	const api = validateOptionalApi(body.api, "api");
	const baseUrl = asOptionalString(body.baseUrl, "baseUrl", 2000);
	const input: string[] = Array.isArray(body.input)
		? body.input.filter((item): item is string => item === "text" || item === "image")
		: ["text"];
	if (!input.includes("text")) input.unshift("text");
	const oldCost = existing ? readCost(existing) : {};
	const costs = isObject(body.cost) ? body.cost : {};
	const thinkingLevelMap = getObjectField(body, "thinkingLevelMap") ?? getObjectField(body, "thinkingLevelMapJson");
	const samplingParams = getObjectField(body, "samplingParams") ?? getObjectField(body, "samplingParamsJson");
	const compat = getObjectField(body, "compatJson");
	const headers = parseHeaders(body.headers !== undefined ? body.headers : body.headersJson);
	const tiers = getArrayField(body, "costTiers") ?? getArrayField(body, "costTiersJson");
	const next: JsonObject = {
		...(existing ?? {}),
		id,
		name: name ?? id,
		reasoning: asBoolean(body.reasoning),
		input,
		contextWindow: asPositiveInteger(body.contextWindow, "contextWindow", 128_000),
		maxTokens: asPositiveInteger(body.maxTokens, "maxTokens", 16_384),
		cost: {
			...oldCost,
			input: asNonNegativeNumber(costs.input, "input cost", 0),
			output: asNonNegativeNumber(costs.output, "output cost", 0),
			cacheRead: asNonNegativeNumber(costs.cacheRead, "cacheRead cost", 0),
			cacheWrite: asNonNegativeNumber(costs.cacheWrite, "cacheWrite cost", 0),
		},
	};
	setOrDeleteField(next, "api", api, body.clearApi === true);
	setOrDeleteField(next, "baseUrl", baseUrl, body.clearBaseUrl === true);
	setOrDeleteField(next, "thinkingLevelMap", thinkingLevelMap, body.clearThinkingLevelMap === true);
	mergeObjectField(next, "samplingParams", samplingParams, body.clearSamplingParams === true);
	setOrDeleteField(next, "compat", compat, body.clearCompat === true);
	if (body.clearHeaders === true) delete next.headers;
	if (headers) next.headers = { ...(isObject(next.headers) ? next.headers : {}), ...headers };
	const cost = next.cost as JsonObject;
	if (tiers) cost.tiers = tiers;
	if (body.clearCostTiers === true) delete cost.tiers;
	return next;
}

export async function saveModel(body: JsonObject): Promise<{ provider: string; id: string }> {
	const providerId = validateIdentifier(getBodyString(body, "provider", 100), "provider ID");
	const originalId = asOptionalString(body.originalId, "originalId", 300);
	return updateConfig((config) => {
		const provider = config.providers[providerId];
		if (!provider) throw new HttpError(404, `找不到 provider: ${providerId}`);
		const models = Array.isArray(provider.models) ? provider.models.filter(isObject) : [];
		const sourceId = originalId ?? getBodyString(body, "id", 300);
		const existingIndex = models.findIndex((model) => model.id === sourceId);
		const duplicateIndex = models.findIndex((model) => model.id === body.id && model.id !== sourceId);
		if (duplicateIndex >= 0) throw new HttpError(409, `model 已存在: ${String(body.id)}`);
		const existing = existingIndex >= 0 ? models[existingIndex] : undefined;
		const model = buildModel(body, existing);
		if (existingIndex >= 0) models[existingIndex] = model;
		else models.push(model);
		provider.models = models;
		return { provider: providerId, id: String(model.id) };
	});
}

export async function deleteModel(body: JsonObject): Promise<void> {
	const providerId = validateIdentifier(getBodyString(body, "provider", 100), "provider ID");
	const modelId = getBodyString(body, "id", 300);
	await updateConfig((config) => {
		const provider = config.providers[providerId];
		if (!provider) throw new HttpError(404, `找不到 provider: ${providerId}`);
		const models = Array.isArray(provider.models) ? provider.models.filter(isObject) : [];
		const next = models.filter((model) => model.id !== modelId);
		if (next.length === models.length) throw new HttpError(404, `找不到 model: ${modelId}`);
		provider.models = next;
	});
}
