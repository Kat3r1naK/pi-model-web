import { HttpError } from "./errors";
import type { JsonObject } from "../types";

export function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ---------- 基础字段校验 ---------- */

export function asNonEmptyString(value: unknown, field: string, maxLength = 500): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new HttpError(400, `${field} 不能为空`);
	}
	const result = value.trim();
	if (result.length > maxLength) throw new HttpError(400, `${field} 太长`);
	return result;
}

export function asOptionalString(value: unknown, field: string, maxLength = 500): string | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value !== "string") throw new HttpError(400, `${field} 必须是字符串`);
	const result = value.trim();
	if (result.length > maxLength) throw new HttpError(400, `${field} 太长`);
	return result || undefined;
}

export function asBoolean(value: unknown, defaultValue = false): boolean {
	return typeof value === "boolean" ? value : defaultValue;
}

export function asPositiveInteger(value: unknown, field: string, defaultValue: number): number {
	const number = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(number) || number <= 0 || number > 10_000_000) {
		if (value === undefined || value === "") return defaultValue;
		throw new HttpError(400, `${field} 必须是正整数`);
	}
	return number;
}

export function asNonNegativeNumber(value: unknown, field: string, defaultValue: number): number {
	const number = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(number) || number < 0 || number > 1_000_000) {
		if (value === undefined || value === "") return defaultValue;
		throw new HttpError(400, `${field} 必须是非负数字`);
	}
	return number;
}

export function validateIdentifier(value: string, field: string): string {
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
		throw new HttpError(400, `${field} 只能包含字母、数字、点、下划线和连字符`);
	}
	return value;
}

/* ---------- JSON 字段解析（支持对象/数组 或 JSON 字符串） ---------- */

export function parseJsonObject(value: unknown, field: string): JsonObject | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (isObject(value)) return value;
	if (typeof value !== "string") throw new HttpError(400, `${field} JSON 必须是字符串或对象`);
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		throw new HttpError(400, `${field} JSON 格式错误`);
	}
	if (!isObject(parsed)) throw new HttpError(400, `${field} JSON 必须是对象`);
	return parsed;
}

export function parseJsonArray(value: unknown, field: string): unknown[] | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (Array.isArray(value)) return value;
	if (typeof value !== "string") throw new HttpError(400, `${field} JSON 必须是字符串或数组`);
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		throw new HttpError(400, `${field} JSON 格式错误`);
	}
	if (!Array.isArray(parsed)) throw new HttpError(400, `${field} JSON 必须是数组`);
	return parsed;
}

export function parseHeaders(value: unknown): Record<string, string> | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	let parsed: unknown = value;
	if (typeof value === "string") {
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new HttpError(400, "headers JSON 格式错误");
		}
	}
	if (!isObject(parsed)) throw new HttpError(400, "headers 必须是对象");
	const headers: Record<string, string> = {};
	for (const [key, item] of Object.entries(parsed)) {
		if (typeof item !== "string") throw new HttpError(400, `header ${key} 的值必须是字符串`);
		headers[key] = item;
	}
	return headers;
}

/* ---------- 请求体字段读取/写入辅助 ---------- */

export function getBodyString(body: JsonObject, field: string, maxLength = 500): string {
	return asNonEmptyString(body[field], field, maxLength);
}

export function getObjectField(body: JsonObject, field: string): JsonObject | undefined {
	return parseJsonObject(body[field], field);
}

export function getArrayField(body: JsonObject, field: string): unknown[] | undefined {
	return parseJsonArray(body[field], field);
}

/** clear=true 时删除字段；否则 value 非 undefined 时写入（留空保留原值语义） */
export function setOrDeleteField(target: JsonObject, field: string, value: unknown, clear: boolean): void {
	if (clear) delete target[field];
	else if (value !== undefined) target[field] = value;
}

/** 对象型字段的浅合并版本 */
export function mergeObjectField(
	target: JsonObject,
	field: string,
	value: JsonObject | undefined,
	clear: boolean,
): void {
	if (clear) delete target[field];
	else if (value !== undefined) target[field] = { ...(isObject(target[field]) ? target[field] : {}), ...value };
}
