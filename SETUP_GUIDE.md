# OpenCode MCP 连接指南

## 前提条件

1. 已安装 Node.js 18+
2. 已有 RunningHub API Key
3. 已有 RunningHub APP ID

## 部署步骤

### 1. 克隆并构建项目

```bash
# 克隆仓库
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP

# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 创建配置文件

在项目根目录创建 `runninghub-mcp-config.json`：

```json
{
  "apiKey": "YOUR_RUNNINGHUB_API_KEY",
  "baseUrl": "www.runninghub.ai",
  "maxConcurrent": 1,
  "storage": {
    "type": "local",
    "path": "./output"
  },
  "apps": {
    "my-app": {
      "appId": "YOUR_APP_ID",
      "alias": "my-app",
      "category": "image",
      "description": "My RunningHub APP",
      "inputs": {}
    }
  },
  "modelRules": {
    "source": "github",
    "repo": "runninghub-model-rules",
    "branch": "main",
    "rules": {},
    "defaultLanguage": "zh"
  },
  "retry": {
    "maxRetries": 3,
    "maxWaitTime": 600,
    "interval": 5
  },
  "logging": {
    "level": "info"
  }
}
```

### 3. 验证服务器启动

```bash
# 启动服务器
npm start

# 应该看到：
# ✅ RunningHub MCP Server started successfully!
#    MCP endpoint: http://localhost:3000/mcp
#    Health check: http://localhost:3000/health
```

按 Ctrl+C 停止服务器。

### 4. 配置 OpenCode

找到 OpenCode 配置文件位置：

- **Windows**: `%APPDATA%\opencode\mcp_config.json` 或 `%USERPROFILE%\.config\opencode\mcp_config.json`
- **macOS/Linux**: `~/.config/opencode/mcp_config.json`

编辑配置文件，添加 RunningHub MCP 服务：

```json
{
  "mcpServers": {
    "runninghub": {
      "command": "node",
      "args": ["E:/Projects/RHMCP/dist/server/index.js"],
      "env": {
        "CONFIG_PATH": "E:/Projects/RHMCP/runninghub-mcp-config.json"
      }
    }
  }
}
```

> ⚠️ **注意**：请将路径替换为你实际的项目路径。

### 5. 重启 OpenCode

重启 OpenCode 后，RunningHub MCP 工具应该可用。

## 可用工具

| 工具              | 描述                      |
| ----------------- | ------------------------- |
| `rh_upload_media` | 上传媒体文件到 RunningHub |
| `rh_get_app_info` | 获取 APP 配置信息         |
| `rh_execute_app`  | 执行 APP 任务             |
| `rh_query_task`   | 查询任务状态              |
| `rh_add_app`      | 注册新 APP                |
| `rh_remove_app`   | 删除 APP                  |
| `rh_update_rules` | 更新模型规则              |
| `rh_list_rules`   | 列出可用规则              |

## 可用资源

| 资源 URI              | 描述                     |
| --------------------- | ------------------------ |
| `rh://apps`           | 所有 APP 列表            |
| `rh://apps/{alias}`   | 特定 APP 详情            |
| `rh://tasks/{taskId}` | 任务状态                 |
| `rh://tasks/history`  | 任务历史记录             |
| `rh://rules`          | 模型规则列表             |
| `rh://config`         | 当前配置（隐藏敏感信息） |

## 使用示例

启动 OpenCode 后，你可以：

1. **上传图片**：

   > "请使用 rh_upload_media 上传我的图片文件 E:/test.png"

2. **执行 APP**：

   > "使用 my-app 生成一张图片，prompt 是 '一只可爱的猫'"

3. **查询任务**：

   > "查询任务状态，taskId 是 xxx"

4. **查看配置**：
   > "列出所有可用的 APP"

## 环境变量（可选）

| 变量                 | 描述                    | 默认值                       |
| -------------------- | ----------------------- | ---------------------------- |
| `PORT`               | 服务端口                | `3000`                       |
| `CONFIG_PATH`        | 配置文件路径            | `runninghub-mcp-config.json` |
| `RUNNINGHUB_API_KEY` | API Key（覆盖配置文件） | -                            |

## 故障排除

### 问题：MCP 连接失败

- 检查路径是否正确
- 确保已运行 `npm run build`
- 检查配置文件是否存在

### 问题：API Key 无效

- 确认 RunningHub 账户状态正常
- 检查 API Key 是否正确配置

### 问题：找不到配置文件

```bash
# 使用绝对路径
CONFIG_PATH=/absolute/path/to/runninghub-mcp-config.json npm start
```

## 独立模式运行

如果你想独立运行 MCP 服务器（不以 STDIO 方式）：

```bash
# 启动 HTTP 服务
PORT=3000 npm start

# MCP 端点：http://localhost:3000/mcp
# 健康检查：http://localhost:3000/health
```
