/**
 * 公共请求封装：鉴权优先用首次访问时下发的会话 Cookie（同源请求自动携带），
 * URL 里还有 token 时同时带上请求头兼容旧链路。
 */

const token = new URLSearchParams(window.location.search).get("token") ?? "";

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
	}
}

export interface RequestOptions {
	method?: "GET" | "POST";
	body?: unknown;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const headers: Record<string, string> = {};
	if (token) headers["x-model-web-token"] = token;
	if (options.body !== undefined) headers["content-type"] = "application/json";

	const response = await fetch(path, {
		method: options.method ?? "GET",
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});

	const text = await response.text();
	let data: Record<string, unknown> = {};
	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = { error: text };
	}
	if (!response.ok) {
		throw new ApiError(String(data.error || `HTTP ${response.status}`), response.status);
	}
	return data as T;
}
