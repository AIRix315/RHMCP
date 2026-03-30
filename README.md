# RHMCP

[![CI](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **RHMCP** - RunningHub AI Platform MCP Server - 让 AI Agent 轻松调用生图、生成视频、音频处理等功能。

## 快速链接

| 文档 | 说明 |
|------|------|
| **[OpenCode 配置](docs/OpenCode-setup.md)** | OpenCode MCP 集成指南 |
| **[OpenClaw 配置](docs/OpenClaw-setup.md)** | OpenClaw MCP 集成指南 |
| **[用户指南](docs/USER_GUIDE.md)** | 完整使用教程 |
| **[安装问题](docs/INSTALLATION_ISSUES.md)** | 常见问题及解决方案 |

---

## ⚠️ 配置前必读

### baseUrl 选择

**请根据您的账号和服务器位置选择正确的域名：**

| 域名                | 说明   | 适用场景                   |
| ------------------- | ------ | -------------------------- |
| `www.runninghub.cn` | 国内站 | 服务器在中国，注册在国内站 |
| `www.runninghub.ai` | 国际站 | 服务器在海外，注册在国际站 |

**错误选择会导致 API 调用失败！**

### storage.mode 选择

| 模式      | 说明           | 适用场景                              |
| --------- | -------------- | ------------------------------------- |
| `local`   | 下载文件到本地 | 默认模式，适合本地使用                |
| `network` | 上传到云存储   | 需要配置云存储（百度云/阿里云等）     |
| `auto`    | Agent 自动判断 | 需要继续处理返回URL，需交付用户则下载 |
| `none`    | 不保存         | 仅返回服务器原始URL                   |

---

## 一分钟开始

### 方式一：使用共享测试 APP（推荐）

**共享 APP ID 直接使用！**

```bash
# 1. 克隆项目
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build

# 2. 创建配置文件（新格式）
cp service.json.example service.json
cp apps.json.example apps.json

# 3. 设置 API Key
echo "RUNNINGHUB_API_KEY=your_api_key_here" > .env

# 4. 运行测试
node test-api.mjs
```

> 💡 **提示**: 也支持旧配置格式 `rhmcp-config.json`，会自动迁移。

### 获取 API Key

1. 访问 [RunningHub](https://www.runninghub.cn) 注册账号
2. 进入「个人中心」→「API 控制台」
3. 创建并复制 API Key

### 共享测试 APP

运行 `rhmcp --update-apps` 可自动获取最新官方 APP 列表：

| APP ID                | 别名                  | 类型     | 说明           |
| --------------------- | --------------------- | -------- | -------------- |
| `2037760725296357377` | `qwen-text-to-image`  | 图片生成 | Qwen文生图     |
| `2037822548796252162` | `qwen-image-to-image` | 图片修改 | Qwen提示词改图 |

---

## 配置说明

### 新配置格式（推荐）

配置分为三个文件：

**1. service.json** - 服务配置
```json
{
  "baseUrl": "auto",
  "maxConcurrent": 1,
  "storage": { "mode": "local", "path": "./output" },
  "retry": { "maxRetries": 3, "maxWaitTime": 600, "interval": 5 },
  "logging": { "level": "info" },
  "modelRules": { "rules": {}, "defaultLanguage": "zh" }
}
```

**2. apps.json** - APP 配置
```json
{
  "server": { "_comment": "官方共享APP，由 --update-apps 更新" },
  "user": {
    "my-app": {
      "appId": "YOUR_APP_ID",
      "alias": "my-app",
      "category": "image",
      "description": "我的APP"
    }
  }
}
```

**3. .env** - 敏感配置
```
RUNNINGHUB_API_KEY=your_api_key_here
RUNNINGHUB_BASE_URL=www.runninghub.cn  # 可选，优先级高于 service.json
```

### 旧配置格式（向后兼容）

仍支持 `rhmcp-config.json` 单文件格式，会自动迁移。

### 配置优先级

```
环境变量 > service.json > 默认值
```

### 配置字段说明

| 字段           | 必填 | 说明                                        |
| -------------- | ---- | ------------------------------------------- |
| `baseUrl`      | ✅   | API 域名，支持 `auto`（自动检测）、`www.runninghub.cn`、`www.runninghub.ai` |
| `RUNNINGHUB_API_KEY` | ✅ | API Key（环境变量）                        |
| `storage.mode` | ❌   | 存储模式，默认 `local`                     |
| `storage.path` | ❌   | 本地存储路径，默认 `./output`              |

---

## 可用工具

| 工具              | 用途                            |
| ----------------- | ------------------------------- |
| `rh_upload_media` | 上传图片/视频/音频到 RunningHub |
| `rh_get_app_info` | 获取 APP 配置和参数说明         |
| `rh_execute_app`  | 执行 APP 生成内容               |
| `rh_query_task`   | 查询任务状态和结果              |
| `rh_add_app`      | 添加新 APP 到配置               |
| `rh_remove_app`   | 移除 APP                        |
| `rh_update_rules` | 更新模型规则                    |
| `rh_list_rules`   | 列出可用规则                    |

---

## 输出存储

所有生成的内容根据 `storage.mode` 处理：

- **local**: 下载到 `./output/` 目录
- **network**: 上传到云存储
- **auto**: Agent 自动判断
- **none**: 仅返回 URL

---

## 配置 OpenCode

### 方式一：全局安装（推荐）

```bash
# 1. 克隆并构建
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build

# 2. 全局链接（需要管理员权限）
npm link

# 3. 验证安装
rhmcp --help
```

编辑 OpenCode 配置文件（`~/.config/opencode/opencode.json`）：

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["rhmcp", "--stdio"],
      "environment": {
        "RHMCP_CONFIG": "/完整路径/RHMCP"
      }
    }
  }
}
```

### 方式二：直接运行

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["node", "/完整路径/RHMCP/dist/server/index.js", "--stdio"],
      "environment": {
        "RHMCP_CONFIG": "/完整路径/RHMCP"
      }
    }
  }
}
```

### HTTP 模式（可选）

如果需要 HTTP API 访问：

```json
{
  "mcp": {
    "rhmcp": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

然后运行：`rhmcp --http`

---

## 运行模式

RHMCP 支持两种运行模式：

### STDIO 模式（默认推荐）

用于 MCP 客户端集成（OpenCode、Claude Desktop 等）：

```bash
rhmcp --stdio
# 或
MCP_TRANSPORT=stdio rhmcp
```

### HTTP 模式

用于 HTTP API 访问和云部署：

```bash
rhmcp --http
# 或
rhmcp  # 默认 HTTP 模式
# 或
PORT=8080 rhmcp --http
```

访问：
- MCP 端点: `http://localhost:3000/mcp`
- 健康检查: `http://localhost:3000/health`

---

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（HTTP）
npm run dev

# 开发模式（STDIO）
npm run dev:stdio

# 运行测试
node test-api.mjs
```

---

## 许可证

MIT License

---

**重要提醒**:

1. **baseUrl 必须选择正确的域名**（国内站用 .cn，国际站用 .ai）
2. **apiKey 必须从 RunningHub 个人中心获取**
3. **共享 APP ID 仅用于测试**，生产环境请使用自己的 APP
