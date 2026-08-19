/**
 * 剥离 JSON 中的 // 与 /* ... *\/ 注释（models.json 允许手写注释）。
 * 用状态机逐字符扫描，能识别字符串内的 "/"，不会误删。
 * 注释位置以空格/换行填充，保持行列号不变。
 */
export function stripJsonComments(text: string): string {
	let result = "";
	let inString = false;
	let escaped = false;
	let lineComment = false;
	let blockComment = false;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = text[index + 1];
		if (lineComment) {
			if (char === "\n") {
				lineComment = false;
				result += char;
			} else result += " ";
			continue;
		}
		if (blockComment) {
			if (char === "*" && next === "/") {
				blockComment = false;
				result += "  ";
				index += 1;
			} else if (char === "\n") result += "\n";
			else result += " ";
			continue;
		}
		if (inString) {
			result += char;
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') {
			inString = true;
			result += char;
			continue;
		}
		if (char === "/" && next === "/") {
			lineComment = true;
			result += "  ";
			index += 1;
			continue;
		}
		if (char === "/" && next === "*") {
			blockComment = true;
			result += "  ";
			index += 1;
			continue;
		}
		result += char;
	}
	return result;
}
