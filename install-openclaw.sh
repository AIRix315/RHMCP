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

# 输出配置片段
cat << 'EOF'

✅ 安装完成

OpenClaw 配置（添加到 ~/.openclaw/openclaw.json）：

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

替换：
  INSTALL_DIR = 实际安装路径
  CONFIG_DIR = ~/.rhmcp

重启 OpenClaw，首次使用提示配置 RUNNINGHUB_API_KEY。
EOF