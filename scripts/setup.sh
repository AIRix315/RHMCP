#!/bin/bash

# RunningHub MCP 一键部署脚本

set -e

echo "🚀 RunningHub MCP 部署脚本"
echo "========================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 创建配置文件（如果不存在）
if [ ! -f "runninghub-mcp-config.json" ]; then
    echo ""
    echo "📝 创建配置文件..."
    cp config/runninghub-mcp-config.example.json runninghub-mcp-config.json
    echo "✅ 已创建 runninghub-mcp-config.json"
    echo "⚠️  请编辑配置文件，填入您的 API Key 和 APP ID"
else
    echo "✅ 配置文件已存在"
fi

# 创建存储目录
echo ""
echo "📁 创建存储目录..."
mkdir -p output
mkdir -p config/model-rules-cache

# 下载模型规则（可选）
echo ""
echo "📥 下载模型规则（可选）..."
read -p "是否现在下载模型规则？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 这里可以调用 rh_update_rules 工具
    echo "请启动服务后调用 rh_update_rules 工具下载规则"
fi

# 构建项目
echo ""
echo "🔨 构建项目..."
npm run build

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 编辑 runninghub-mcp-config.json，填入 API Key"
echo "2. 添加 APP ID 到 apps 配置"
echo "3. 运行 npm start 启动服务"
echo ""
echo "🌐 MCP 端点: http://localhost:3000/mcp"