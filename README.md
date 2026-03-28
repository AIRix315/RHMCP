# RunningHub MCP Service

[![CI](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **一站式 RunningHub AI 平台 MCP 服务** - 让 AI Agent 轻松调用生图、生成视频、音频处理等功能。

## 快速链接

| 文档                                | 说明                                     |
| ----------------------------------- | ---------------------------------------- |
| **[用户指南](docs/USER_GUIDE.md)**  | 完整使用教程，含 RunningHub APP 设置指南 |
| **[部署指南](docs/SETUP_GUIDE.md)** | OpenCode/Claude Desktop 接入配置         |
| **[共享测试 APP](#共享测试-app)**   | 免费测试 APP ID，快速体验                |

## 特性

- 🛠️ **8 个 MCP 工具** - 上传、执行、查询、APP 管理等
- 📦 **6 个 MCP 资源** - APP 配置、任务状态、规则查询
- 🔄 **自动重试策略** - 可配置重试次数和超时
- ✅ **参数验证** - 服务级 + 模型级 + APP级三层约束

## 一分钟开始

### 方式一：使用共享测试 APP（推荐）

**无需注册 RunningHub 账号，直接使用共享 APP ID 测试！**

```bash
# 1. 克隆项目
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build

# 2. 创建配置文件（使用共享 APP ID）
cat > runninghub-mcp-config.json << 'EOF'
{
  "apiKey": "获取你的API Key",
  "baseUrl": "www.runninghub.ai",
  "maxConcurrent": 1,
  "storage": { "type": "local", "path": "./output" },
  "apps": {
    "test-image": {
      "appId": "2037760725296357377",
      "alias": "test-image",
      "category": "image",
      "description": "共享测试APP - 图片生成"
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

1. 访问 [RunningHub](https://www.runninghub.ai) 注册账号
2. 进入「个人中心」→「API 密钥」
3. 创建并复制 API Key

### 共享测试 APP

| APP ID                | 类型     | 说明                           |
| --------------------- | -------- | ------------------------------ |
| `2037760725296357377` | 图片生成 | 由 AIRix315 提供的共享测试 APP |

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

重启 OpenCode 后即可使用 RunningHub 工具。

## 文件结构

```
RHMCP/
├── docs/                    # 文档目录
│   ├── USER_GUIDE.md       # 用户使用指南
│   └── SETUP_GUIDE.md      # 部署指南
├── output/                  # 输出目录（自动创建）
│   ├── images/              # 生成的图片
│   ├── videos/              # 生成的视频
│   └── model-rules-cache/   # 模型规则缓存
├── config/                  # 配置模板
│   └── runninghub-mcp-config.example.json
├── src/                      # 源代码
├── test-api.mjs             # API 测试脚本
└── runninghub-mcp-config.json  # 用户配置（需创建）
```

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

## 使用示例

### 在 OpenCode 中使用

```
用户: 请用 RunningHub 生成一张图片，描述是 "一只在星空下的猫咪"

Agent 将自动调用 rh_execute_app 工具：
1. 查找配置中的 image 类型 APP
2. 构建请求参数
3. 提交任务
4. 等待结果并返回图片 URL
```

### API 测试

```bash
# 测试实际 API 调用
node test-api.mjs

# 使用环境变量
RUNNINGHUB_API_KEY=your_key node test-api.mjs
```

## 输出存储

所有生成的内容默认保存在 `./output/` 目录：

```bash
output/
├── images/           # 生成的图片
├── videos/           # 生成的视频
├── audio/            # 生成的音频
└── history.json      # 执行历史记录
```

配置云存储请参考 [docs/USER_GUIDE.md](docs/USER_GUIDE.md)。

## 创建自己的 APP

详细步骤见 [docs/USER_GUIDE.md](docs/USER_GUIDE.md) 的「RunningHub APP 设置指南」章节。

简要流程：

1. 登录 [RunningHub](https://www.runninghub.ai)
2. 创建或导入 ComfyUI 工作流
3. 发布并获取 APP ID
4. 在配置文件中添加 APP ID

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式
npm run dev

# 类型检查
npx tsc --noEmit

# 格式检查
npx prettier --check "src/**/*.ts"

# 运行测试
node test-api.mjs
```

## 故障排除

详见 [docs/USER_GUIDE.md](docs/USER_GUIDE.md) 的「故障排除」章节。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 使用前请确保配置正确的 API Key。共享 APP ID 仅用于测试，生产环境请使用自己的 APP。
