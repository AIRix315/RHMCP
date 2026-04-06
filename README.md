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

> ⚠️ **重要说明**：npm 包 `runninghub-mcp` 暂时不可用。请使用以下 GitHub 安装方式。

### 推荐方式：GitHub 直接安装

```bash
# 全局安装（推荐）
npm install -g AIRix315/RHMCP

# 验证安装
rhmcp --help
```

### 方式二：克隆仓库本地构建

```bash
# 克隆仓库
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP

# 安装依赖
npm ci

# 构建
npm run build

# 全局链接
npm link
```

### 方式三：指定版本安装

```bash
# 从 GitHub Release 安装
npm install -g AIRix315/RHMCP#v1.1.1
```

### 配置步骤

```bash
# 1. 创建配置目录
mkdir -p ~/.rhmcp

# 2. 设置 API Key（从 https://www.runninghub.cn 获取）
echo "RUNNINGHUB_API_KEY=your_api_key_here" > ~/.rhmcp/.env

# 3. 创建 service.json
cat > ~/.rhmcp/service.json << 'EOF'
{
  "baseUrl": "auto",
  "maxConcurrent": 1,
  "storage": { "mode": "none" }
}
EOF

# 4. 创建 apps.json（运行更新命令获取官方 APP 列表）
rhmcp --update-apps ~/.rhmcp/apps.json
```

> **baseUrl 说明**：
>
> - `"auto"`：自动检测账号区域
> - `"www.runninghub.cn"`：国内站
> - `"www.runninghub.ai"`：国际站

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
| **存储决策**   | AUTO 模式智能选择最佳存储方式                    |
| **链式工作流** | URL 自动传递，支持多步骤任务                     |
| **错误处理**   | 友好提示 + 自动重试策略                          |

详细配置请参考 **[skills/openclaw/README.md](skills/openclaw/README.md)**。

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

---

## 许可证

MIT License
