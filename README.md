# RunningHub MCP Service

[![CI](https://github.com/your-username/runninghub-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/runninghub-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/your-username/runninghub-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/your-username/runninghub-mcp/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/runninghub-mcp.svg)](https://www.npmjs.com/package/runninghub-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个 MCP (Model Context Protocol) 服务，让 AI Agent 能够轻松调用 RunningHub 平台的生图、生视频、改图、生成音乐等功能。

## 特性

- 🚀 **8 个 MCP 工具** - 完整的 CRUD 操作
- 📦 **6 个 MCP 资源** - 配置和状态查询
- 🔄 **自动/手动双模式** - 模型规则管理
- ⚡ **分层重试策略** - 全局 + APP级配置
- ✅ **参数约束验证** - 服务级 + 模型级 + APP级

## 快速开始

### 方式一：从 GitHub 部署

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/runninghub-mcp.git
cd runninghub-mcp

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 配置
cp config/runninghub-mcp-config.example.json runninghub-mcp-config.json
# 编辑 runninghub-mcp-config.json，填入你的 API Key 和 APP ID

# 5. 运行
npm start
```

### 方式二：一键部署脚本

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/your-username/runninghub-mcp/main/scripts/setup.sh | bash
```

**Windows:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/your-username/runninghub-mcp/main/scripts/setup.bat" -OutFile "setup.bat" && .\setup.bat
```

## 工具列表

| 工具 | 描述 |
|------|------|
| `rh_upload_media` | 上传媒体文件 |
| `rh_get_app_info` | 获取 APP 配置 |
| `rh_execute_app` | 执行 APP |
| `rh_query_task` | 查询任务状态 |
| `rh_add_app` | 注册 APP |
| `rh_remove_app` | 删除 APP |
| `rh_update_rules` | 更新模型规则 |
| `rh_list_rules` | 列出规则 |

## 资源列表

| 资源 | 描述 |
|------|------|
| `rh://apps` | APP 列表 |
| `rh://apps/{alias}` | APP 详情 |
| `rh://tasks/{taskId}` | 任务状态 |
| `rh://tasks/history` | 任务历史 |
| `rh://rules` | 模型规则列表 |
| `rh://config` | 当前配置 |

## 分层约束体系

参数验证合并三层约束：

1. **服务级** - 硬性规定（如文件大小 ≤ 30MB）
2. **模型级** - GitHub 规则库（如 FLUX 仅支持英文）
3. **APP级** - 用户自定义

## 模型规则贡献

欢迎贡献模型规则到 [runninghub-model-rules](https://github.com/runninghub-model-rules) 仓库。

规则文件格式：

```json
{
  "name": "Qwen Image",
  "constraints": {
    "width": { "min": 256, "max": 2048 },
    "prompt": {
      "languages": ["zh", "en"]
    }
  }
}
```

## 配置 MCP 客户端（如 OpenCode/Claude Desktop）

### OpenCode 配置

编辑 OpenCode 配置文件（通常位于 `~/.config/opencode/mcp_config.json` 或 `%APPDATA%/opencode/mcp_config.json`）：

```json
{
  "mcpServers": {
    "runninghub": {
      "command": "node",
      "args": ["/path/to/runninghub-mcp/dist/server/index.js"],
      "env": {
        "CONFIG_PATH": "/path/to/runninghub-mcp-config.json"
      }
    }
  }
}
```

### Claude Desktop 配置

编辑 Claude Desktop 配置文件：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "runninghub": {
      "command": "node",
      "args": ["C:/path/to/runninghub-mcp/dist/server/index.js"],
      "env": {
        "CONFIG_PATH": "C:/path/to/runninghub-mcp-config.json"
      }
    }
  }
}
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/mcp` | POST | MCP 协议端点 |
| `/health` | GET | 健康检查 |

## 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `CONFIG_PATH` | 配置文件路径 | `runninghub-mcp-config.json` |
| `RUNNINGHUB_API_KEY` | API Key（覆盖配置文件） | - |

## 开发

```bash
# 开发模式（热重载）
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build
```

## 故障排除

### 常见问题

1. **配置文件未找到**
   - 确保 `runninghub-mcp-config.json` 在项目根目录或通过 `CONFIG_PATH` 指定

2. **API Key 无效**
   - 检查 API Key 是否正确配置
   - 确认 RunningHub 账户状态正常

3. **端口被占用**
   - 设置环境变量 `PORT=3001` 使用其他端口

## 许可证

MIT
