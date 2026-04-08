#!/bin/bash
set -e

VERSION="${1:-latest}"
INSTALL_DIR="${RHMCP_INSTALL_DIR:-$HOME/.rhmcp}"

echo "🚀 安装 RHMCP v${VERSION}..."

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 下载文件
if [ "$VERSION" = "latest" ]; then
  DOWNLOAD_URL=$(curl -fsSL https://api.github.com/repos/AIRix315/RHMCP/releases/latest | grep "browser_download_url.*tar.gz\"" | head -1 | cut -d'"' -f4)
  SHA256_URL=$(curl -fsSL https://api.github.com/repos/AIRix315/RHMCP/releases/latest | grep "browser_download_url.*tar.gz.sha256" | head -1 | cut -d'"' -f4)
else
  DOWNLOAD_URL="https://github.com/AIRix315/RHMCP/releases/download/v${VERSION}/rhmcp-openclaw-${VERSION}.tar.gz"
  SHA256_URL="https://github.com/AIRix315/RHMCP/releases/download/v${VERSION}/rhmcp-openclaw-${VERSION}.tar.gz.sha256"
fi

FILENAME=$(basename "$DOWNLOAD_URL")

echo "📥 下载 ${FILENAME}..."
curl -fsSL "$DOWNLOAD_URL" -o "$FILENAME"
curl -fsSL "$SHA256_URL" -o "${FILENAME}.sha256"

# SHA256 校验
echo "🔐 验证 SHA256..."
if command -v sha256sum &> /dev/null; then
  sha256sum -c "${FILENAME}.sha256" || { echo "❌ SHA256 校验失败"; exit 1; }
elif command -v shasum &> /dev/null; then
  EXPECTED=$(cat "${FILENAME}.sha256" | awk '{print $1}')
  ACTUAL=$(shasum -a 256 "$FILENAME" | awk '{print $1}')
  [ "$EXPECTED" = "$ACTUAL" ] || { echo "❌ SHA256 校验失败"; exit 1; }
else
  echo "⚠️ 未找到 sha256sum 或 shasum，跳过校验"
fi

# 解压
echo "📦 解压..."
tar -xzf "$FILENAME"
rm -f "$FILENAME" "${FILENAME}.sha256"

# 创建配置目录
mkdir -p "$HOME/.rhmcp"

# 创建默认配置
if [ ! -f "$HOME/.rhmcp/service.json" ]; then
  echo '{"baseUrl":"auto","maxConcurrent":1,"storage":{"mode":"none"}}' > "$HOME/.rhmcp/service.json"
fi

# 更新 APP 列表
echo "📋 更新 APP 列表..."
node "$INSTALL_DIR/dist/server/index.js" --update-apps "$HOME/.rhmcp/apps.json" 2>/dev/null || true

# 复制模型规则
if [ -d "$INSTALL_DIR/rules" ]; then
  echo "📋 复制模型规则..."
  cp -r "$INSTALL_DIR/rules" "$HOME/.rhmcp/" 2>/dev/null || true
fi

# 输出配置片段（自动替换路径）
cat << EOF

✅ 安装完成

OpenClaw 配置（添加到 ~/.openclaw/openclaw.json）：

$(cat << 'JSONCONFIG'
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": ["INSTALL_DIR/dist/server/index.js", "--stdio"],
        "env": { "RHMCP_CONFIG": "CONFIG_DIR" }
      }
    }
  },
  "skills": {
    "entries": {
      "rhmcp-skill": { "enabled": true, "path": "INSTALL_DIR/skills/openclaw" }
    }
  }
}
JSONCONFIG
) | sed "s|INSTALL_DIR|$INSTALL_DIR|g" | sed "s|CONFIG_DIR|$HOME/.rhmcp|g")

⚠️ MCP Server 和 Skills 两项都必须配置！

下一步：
  1. 创建 ~/.rhmcp/.env 文件，写入：RUNNINGHUB_API_KEY=your_api_key
  2. 重启 OpenClaw
EOF