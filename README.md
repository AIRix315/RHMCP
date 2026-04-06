# RHMCP

[![CI](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/runninghub-mcp.svg)](https://www.npmjs.com/package/runninghub-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **RHMCP** - RunningHub AI Platform MCP Server - 让 AI Agent 调用生图、视频生成、音频处理等功能。

---

## 文档导航

| 客户端             | 文档                                    |
| ------------------ | --------------------------------------- |
| **OpenCode**       | [配置指南](docs/OpenCode-setup.md)      |
| **OpenClaw**       | [配置指南](docs/OpenClaw-setup.md)      |
| **OpenClaw Skill** | [Skill 指南](skills/openclaw/README.md) |
| **Claude Desktop** | 参考 OpenCode 配置                      |
| **常见问题**       | [FAQ](docs/openclaw/FAQ.md)             |

---

## 安装使用

> ⚠️ **临时说明**：npm 包 `runninghub-mcp` 暂时不可用，请使用以下 GitHub 安装方式。

### 全局安装（推荐）

```bash
npm install -g AIRix315/RHMCP

# 验证安装
rhmcp --help
```

### 直接运行（无需安装）

```bash
npx AIRix315/RHMCP --stdio
```

### 从 GitHub Release 安装指定版本

```bash
npm install -g AIRix315/RHMCP#v1.1.1
```

### 配置

```bash
# 创建配置目录
mkdir -p ~/.rhmcp

# 设置 API Key
echo "RUNNINGHUB_API_KEY=your_api_key_here" > ~/.rhmcp/.env

# 创建 service.json
cat > ~/.rhmcp/service.json << 'EOF'
{
  "baseUrl": "auto",
  "maxConcurrent": 1,
  "storage": { "mode": "none" }
}
EOF

# 创建 apps.json（运行更新命令填充官方 APP）
rhmcp --update-apps ~/.rhmcp/apps.json
```

### MCP 客户端配置

**OpenCode** (`~/.config/opencode/opencode.json`):

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["rhmcp", "--stdio"],
      "environment": {
        "RHMCP_CONFIG": "/home/user/.rhmcp"
      }
    }
  }
}
```

**Claude Desktop** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "rhmcp": {
      "command": "rhmcp",
      "args": ["--stdio"],
      "env": {
        "RHMCP_CONFIG": "/home/user/.rhmcp"
      }
    }
  }
}
```

---

## OpenClaw Skill

如果你使用 **OpenClaw**，可以启用内置的 Skill 包装层，获得更友好的 Agent 指引：

### 安装 Skill

在 OpenClaw 配置中添加 Skill 路径：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": ["E:/Projects/RHMCP/dist/server/index.js", "--stdio"],
        "env": {
          "RHMCP_CONFIG": "E:/Projects/RHMCP"
        }
      }
    }
  },
  "skills": {
    "entries": {
      "rhmcp-skill": {
        "enabled": true,
        "path": "E:/Projects/RHMCP/skills/openclaw"
      }
    }
  }
}
```

### Skill 特性

| 特性           | 说明                                             |
| -------------- | ------------------------------------------------ |
| **场景映射**   | 用户说"生成图片" → 自动选择 `qwen-text-to-image` |
| **参数填充**   | 自动填充默认参数（width: 1024, height: 1024）    |
| **存储决策**   | AUTO 模式自动选择最佳存储方式                    |
| **链式工作流** | URL 自动传递，支持多步骤任务                     |
| **错误处理**   | 友好提示 + 自动重试策略                          |

### 调试工具

```bash
# 列出所有 APP
node skills/openclaw/scripts/executor.mjs list

# 查看 APP 详情
node skills/openclaw/scripts/executor.mjs info qwen-text-to-image

# 根据场景推荐
node skills/openclaw/scripts/executor.mjs recommend generate-image
```

详细配置请参考 [skills/openclaw/README.md](skills/openclaw/README.md)。

---

## 开发指南

如需修改源码：

```bash
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build

# 开发模式
npm run dev        # HTTP 模式
npm run dev:stdio  # STDIO 模式

# 测试
npm test
```

---

## 可用工具

| 工具              | 用途               |
| ----------------- | ------------------ |
| `rh_upload_media` | 上传图片/视频/音频 |
| `rh_get_app_info` | 获取 APP 参数配置  |
| `rh_execute_app`  | 执行 APP 生成内容  |
| `rh_query_task`   | 查询任务状态       |
| `rh_add_app`      | 添加自定义 APP     |
| `rh_remove_app`   | 移除 APP           |
| `rh_update_rules` | 更新模型规则       |
| `rh_list_rules`   | 列出可用规则       |

---

## 配置要点

| 配置项       | 说明                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| **baseUrl**  | `auto`（自动检测）、`www.runninghub.cn`（国内站）、`www.runninghub.ai`（国际站） |
| **API Key**  | 从 [RunningHub 控制台](https://www.runninghub.cn) 获取                           |
| **环境变量** | `RHMCP_CONFIG` 指向配置**目录**                                                  |

---

## 发布流程（维护者）

```bash
# 1. 更新版本号
npm version patch|minor|major

# 2. 推送标签
git push --tags

# 3. GitHub Actions 自动创建 Release
# 注意：npm 发布暂不可用，用户需从 GitHub 安装
```

---

## 许可证

MIT License
