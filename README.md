# RunningHub MCP Service

[![CI](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **RunningHub AI 平台 MCP 服务** - 让 AI Agent 轻松调用生图、生成视频、音频处理等功能。

## 快速链接

| 文档                                | 说明                                     |
| ----------------------------------- | ---------------------------------------- |
| **[用户指南](docs/USER_GUIDE.md)**  | 完整使用教程，含 RunningHub APP 设置指南 |
| **[部署指南](docs/SETUP_GUIDE.md)** | OpenCode/Claude Desktop 接入配置         |
| **[共享测试 APP](#共享测试-app)**   | 免费测试 APP ID，快速体验                |

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

# 2. 创建配置文件
cat > runninghub-mcp-config.json << 'EOF'
{
  "apiKey": "YOUR_API_KEY_HERE",
  "baseUrl": "www.runninghub.cn",
  "maxConcurrent": 1,
  "storage": {
    "mode": "local",
    "path": "./output"
  },
  "apps": {
    "qwen-text-to-image": {
      "appId": "2037760725296357377",
      "alias": "qwen-text-to-image",
      "category": "image",
      "description": "Qwen文生图"
    }
  },
  "modelRules": { "rules": {}, "defaultLanguage": "zh" },
  "retry": { "maxRetries": 3, "maxWaitTime": 600, "interval": 5 },
  "logging": { "level": "info" }
}
EOF

# 3. 运行测试
node test-api.mjs
```

### 获取 API Key

1. 访问 [RunningHub](https://www.runninghub.cn) 注册账号
2. 进入「个人中心」→「API 控制台」
3. 创建并复制 API Key

### 共享测试 APP

| APP ID                | 别名                  | 类型     | 说明           |
| --------------------- | --------------------- | -------- | -------------- |
| `2037760725296357377` | `qwen-text-to-image`  | 图片生成 | Qwen文生图     |
| `2037822548796252162` | `qwen-image-to-image` | 图片修改 | Qwen提示词改图 |

---

## 配置说明

### 完整配置示例

```json
{
  "apiKey": "YOUR_API_KEY_HERE",
  "baseUrl": "www.runninghub.cn",
  "maxConcurrent": 1,
  "storage": {
    "mode": "local",
    "path": "./output",
    "cloudConfig": {
      "provider": "baidu",
      "accessKey": "YOUR_ACCESS_KEY",
      "secretKey": "YOUR_SECRET_KEY",
      "bucket": "YOUR_BUCKET"
    }
  },
  "apps": { ... },
  "modelRules": { ... },
  "retry": { "maxRetries": 3, "maxWaitTime": 600, "interval": 5 },
  "logging": { "level": "info" }
}
```

### 配置字段说明

| 字段           | 必填 | 说明                             |
| -------------- | ---- | -------------------------------- |
| `apiKey`       | ✅   | RunningHub API Key               |
| `baseUrl`      | ✅   | API 域名（cn=国内站，ai=国际站） |
| `storage.mode` | ❌   | 存储模式，默认 `local`           |
| `storage.path` | ❌   | 本地存储路径，默认 `./output`    |
| `apps`         | ❌   | APP 配置，支持多个               |

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

编辑 OpenCode 配置文件（`~/.config/opencode/mcp_config.json`）：

```json
{
  "mcpServers": {
    "runninghub": {
      "command": "node",
      "args": ["/完整路径/RHMCP/dist/server/index.js"],
      "env": {
        "CONFIG_PATH": "/完整路径/RHMCP/runninghub-mcp-config.json"
      }
    }
  }
}
```

---

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

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
