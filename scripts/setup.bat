@echo off
REM RunningHub MCP 一键部署脚本 (Windows)

echo 🚀 RunningHub MCP 部署脚本
echo =========================

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js 18+
    exit /b 1
)

echo ✅ Node.js 已安装

REM 安装依赖
echo.
echo 📦 安装依赖...
call npm install

REM 创建配置文件
if not exist "runninghub-mcp-config.json" (
    echo.
    echo 📝 创建配置文件...
    copy config\runninghub-mcp-config.example.json runninghub-mcp-config.json
    echo ✅ 已创建 runninghub-mcp-config.json
    echo ⚠️ 请编辑配置文件，填入您的 API Key 和 APP ID
) else (
    echo ✅ 配置文件已存在
)

REM 创建存储目录
echo.
echo 📁 创建存储目录...
if not exist "output" mkdir output
if not exist "config\model-rules-cache" mkdir config\model-rules-cache

REM 构建项目
echo.
echo 🔨 构建项目...
call npm run build

echo.
echo ✅ 部署完成！
echo.
echo 📋 下一步：
echo 1. 编辑 runninghub-mcp-config.json，填入 API Key
echo 2. 添加 APP ID 到 apps 配置
echo 3. 运行 npm start 启动服务
echo.
echo 🌐 MCP 端点: http://localhost:3000/mcp

pause