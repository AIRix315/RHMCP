# OpenClaw MCP 配置指南

> ⚠️ **重要说明**：OpenClaw 原生 MCP 客户端支持尚未合并到主分支。
>
> 相关进展：
>
> - [Issue #43509](https://github.com/openclaw/openclaw/issues/43509): MCP server config support
> - [Issue #4834](https://github.com/openclaw/openclaw/issues/4834): Native MCP support

---

## 安装 openclaw-mcp

`openclaw-mcp` 是 OpenClaw 的 fork，包含完整的 MCP 客户端支持。

```bash
# 克隆适配器仓库
git clone https://github.com/amor71/openclaw-mcp.git
cd openclaw-mcp

# 安装并构建
pnpm install
pnpm build

# 启动
pnpm start
```

---

## 配置 RHMCP

编辑 `openclaw.json`：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": ["/完整路径/RHMCP/dist/server/index.js", "--stdio"],
        "env": {
          "RHMCP_CONFIG": "/完整路径/RHMCP"
        }
      }
    }
  }
}
```

**配置字段**：

| 字段      | 必填 | 说明                                  |
| --------- | ---- | ------------------------------------- |
| `command` | ✅   | 可执行命令                            |
| `args`    | ❌   | 命令参数                              |
| `env`     | ❌   | 环境变量，`RHMCP_CONFIG` 指向配置目录 |
| `enabled` | ❌   | 是否启用，默认 `true`                 |
| `timeout` | ❌   | 连接超时（毫秒），默认 30000          |

---

## 验证安装

启动 OpenClaw 后，日志应显示：

```
[MCP] Starting server: rhmcp
[MCP] Server rhmcp ready, tools: 8
```

---

## 工具命名转换

适配器加载后，工具命名格式为 `mcp_{server}_{tool}`：

| RHMCP 工具        | OpenClaw 工具名             |
| ----------------- | --------------------------- |
| `rh_upload_media` | `mcp_rhmcp_rh_upload_media` |
| `rh_execute_app`  | `mcp_rhmcp_rh_execute_app`  |
| `rh_query_task`   | `mcp_rhmcp_rh_query_task`   |

---

## 安全配置（可选）

支持 `secret://` URI 方案避免明文存储：

```json
{
  "env": {
    "RUNNINGHUB_API_KEY": "secret://env/RUNNINGHUB_API_KEY"
  }
}
```

---

## 故障排除

**MCP 服务器未启动**

```
[MCP] Server rhmcp failed to start: Error: ...
```

检查项：

- 配置目录路径是否正确
- Node.js 版本 >= 18
- `dist/server/index.js` 文件是否存在

**工具未出现在 Agent 中**

1. 查看 OpenClaw 启动日志，确认 `Server rhmcp ready`
2. 检查 `openclaw.json` 格式是否正确
3. 确认使用的是 `amor71/openclaw-mcp`

---

## 相关文档

- **快速指南**: [GUIDE.md](./openclaw/GUIDE.md)
- **常见问题**: [FAQ.md](./openclaw/FAQ.md)
- **测试清单**: [TEST-CHECKLIST.md](./openclaw/TEST-CHECKLIST.md)（仅用于开发测试）
