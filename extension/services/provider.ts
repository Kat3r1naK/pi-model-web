/** provider 业务逻辑：校验请求体 → 串行更新 models.json */
import { updateConfig } from "../config-store";
import { validateOptionalApi } from "../lib/api-types";
import { HttpError } from "../lib/errors";
import {
	asBoolean,
	asOptionalString,
	getBodyString,
	getObjectField,
	isObject,
	parseHeaders,
	setOrDeleteField,
	validateIdentifier,
} from "../lib/validate";
import type { JsonObject, ProviderConfig } from "../types";

function parseOAuth(value: unknown): "radius" | undefined {
	if (value === "radius") return "radius";
	if (value === "" || value === undefined || value === null) return undefined;
	throw new HttpError(400, "oauth 目前只支持 radius");
}

function mergeModelOverrides(existing: unknown, incoming: JsonObject): JsonObject {
	const result: JsonObject = isObject(existing) ? { ...existing } : {};
	for (const [modelId, override] of Object.entries(incoming)) {
		const oldOverride = isObject(result[modelId]) ? result[modelId] : {};
		result[modelId] = isObject(override) ? { ...oldOverride, ...override } : override;
	}
	return result;
}

export async function saveProvider(body: JsonObject): Promise<string> {
	const id = validateIdentifier(getBodyString(body, "id", 100), "provider ID");
	const originalId = asOptionalString(body.originalId, "originalId", 100);
	if (originalId) validateIdentifier(originalId, "originalId");
	const name = asOptionalString(body.name, "name", 200);
	const baseUrl = asOptionalString(body.baseUrl, "baseUrl", 2000);
	const api = validateOptionalApi(body.api, "api");
	const headers = parseHeaders(body.headersJson);
	const compat = getObjectField(body, "compatJson");
	const modelOverrides = getObjectField(body, "modelOverridesJson");
	const oauth = parseOAuth(body.oauth);
	if (oauth === "radius" && !baseUrl && !originalId) {
		throw new HttpError(400, "启用 radius OAuth 时需要填写 provider Base URL");
	}

	return updateConfig((config) => {
		const sourceId = originalId ?? id;
		const existing = config.providers[sourceId];
		if (sourceId !== id && config.providers[id]) {
			throw new HttpError(409, `provider 已存在: ${id}`);
		}
		const provider: ProviderConfig = { ...(existing ?? {}) };
		provider.name = name ?? (existing ? provider.name : id);
		setOrDeleteField(provider, "baseUrl", baseUrl, body.clearBaseUrl === true);
		setOrDeleteField(provider, "api", api, body.clearApi === true);
		provider.authHeader = asBoolean(body.authHeader, existing?.authHeader === true);
		if (oauth === "radius") provider.oauth = oauth;
		else if (body.oauth === "" || body.clearOAuth === true) delete provider.oauth;
		const apiKey = asOptionalString(body.apiKey, "apiKey", 4000);
		if (apiKey) provider.apiKey = apiKey;
		if (body.clearApiKey === true) delete provider.apiKey;
		if (headers) provider.headers = headers;
		if (body.clearHeaders === true) delete provider.headers;
		if (compat) provider.compat = compat;
		if (body.clearCompat === true) delete provider.compat;
		if (modelOverrides) {
			provider.modelOverrides = mergeModelOverrides(provider.modelOverrides, modelOverrides);
		}
		if (body.clearModelOverrides === true) delete provider.modelOverrides;
		if (!Array.isArray(provider.models)) provider.models = [];
		if (sourceId !== id) delete config.providers[sourceId];
		config.providers[id] = provider;
		return id;
	});
}

export async function deleteProvider(body: JsonObject): Promise<void> {
	const id = validateIdentifier(getBodyString(body, "id", 100), "provider ID");
	await updateConfig((config) => {
		if (!config.providers[id]) throw new HttpError(404, `找不到 provider: ${id}`);
		delete config.providers[id];
	});
}
