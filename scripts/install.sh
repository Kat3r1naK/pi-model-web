#!/usr/bin/env bash
# 将本项目的扩展安装（软链）到 pi 的 extensions 目录。
# 会先把原来的单文件 model-web.ts 备份到 ~/.pi/model-web-backups/。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSIONS_DIR="$HOME/.pi/agent/extensions"
BACKUP_DIR="$HOME/.pi/model-web-backups"

if [ ! -f "$ROOT/extension/dist/index.html" ]; then
	echo "警告：extension/dist/index.html 不存在，请先在 web/ 目录执行 pnpm build" >&2
fi

# 备份原始单文件插件（如果存在）
if [ -f "$EXTENSIONS_DIR/model-web.ts" ]; then
	mkdir -p "$BACKUP_DIR"
	BACKUP_PATH="$BACKUP_DIR/model-web.ts.$(date +%Y%m%d%H%M%S)"
	mv "$EXTENSIONS_DIR/model-web.ts" "$BACKUP_PATH"
	echo "已备份原插件到：$BACKUP_PATH"
fi

# 软链扩展目录（入口为 extension/index.ts）
ln -sfn "$ROOT/extension" "$EXTENSIONS_DIR/model-web"
echo "已链接：$EXTENSIONS_DIR/model-web -> $ROOT/extension"
echo "重启 pi 会话后执行 /model-web 即可生效。"
