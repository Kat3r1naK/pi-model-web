import { HttpError } from "./errors";

/** provider/model 的 api 字段白名单 */
export const SUPPORTED_APIS = [
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

export function validateOptionalApi(value: unknown, field: string): string | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new HttpError(400, `${field} 必须是字符串`);
	}
	const api = value.trim();
	if (api.length > 100) throw new HttpError(400, `${field} 太长`);
	if (!(SUPPORTED_APIS as readonly string[]).includes(api)) {
		throw new HttpError(400, `不支持的 API 类型: ${api}`);
	}
	return api;
}
