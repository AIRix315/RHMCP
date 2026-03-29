# OpenClaw MCP 配置指南

> ⚠️ **重要说明**：OpenClaw 原生 MCP 客户端支持尚未合并到主分支。
>
> 相关进展：
> - [Issue #43509](https://github.com/openclaw/openclaw/issues/43509): MCP server config support
> - [Issue #39225](https://github.com/openclaw/openclaw/issues/39225): ACPX runtime ignores MCP config
> - [Issue #4834](https://github.com/openclaw/openclaw/issues/4834): Native MCP support

官方文档中 `openclaw mcp serve` 描述的是 OpenClaw **作为 MCP 服务器供其他 Agent 使用**，而非作为 MCP 客户端。

---

## 安装 openclaw-mcp

`openclaw-mcp` 是 OpenClaw 的 fork，包含完整的 MCP 客户端支持。

### 方式一：使用预构建版本

```bash
# 克隆适配器仓库
git clone https://github.com/amor71/openclaw-mcp.git
cd openclaw-mcp

# 安装依赖
pnpm install

# 构建
pnpm build

# 使用此版本启动 OpenClaw
pnpm start
```

### 方式二：替代官方 OpenClaw

如果你已安装官方 OpenClaw，需要替换：

```bash
# 备份官方版本
mv ~/.local/bin/openclaw ~/.local/bin/openclaw.bak

# 克隆并构建
git clone https://github.com/amor71/openclaw-mcp.git
cd openclaw-mcp
pnpm install
pnpm build

# 链接到系统
ln -s $(pwd)/bin/openclaw ~/.local/bin/openclaw
```

---

## 配置 RHMCP

编辑 `openclaw.json`：

```json
{
  "agents": {
    "defaults": {
      "mcp": {
        "servers": {
          "rhmcp": {
            "command": "node",
            "args": ["/完整路径/RHMCP/dist/server/index.js", "--stdio"],
            "env": {
              "CONFIG_PATH": "/完整路径/RHMCP/rhmcp-config.json"
            },
            "transport": "stdio"
          }
        }
      }
    }
  }
}
```

---

## 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `command` | string | ✅ | 可执行命令 |
| `args` | array | ❌ | 命令参数 |
| `env` | object | ❌ | 环境变量 |
| `transport` | string | ❌ | 传输协议，默认 `stdio`，可选 `sse`/`http` |
| `enabled` | boolean | ❌ | 是否启用，默认 `true` |
| `timeout` | number | ❌ | 连接超时（毫秒），默认 30000 |
| `restartOnCrash` | boolean | ❌ | 崩溃后自动重启，默认 `true` |
| `maxRestarts` | number | ❌ | 最大重启次数，默认 5 |

---

## 验证安装

启动 OpenClaw 后，日志应显示：

```
[MCP] Starting server: rhmcp
[MCP] Server rhmcp ready, tools: 8
```

---

## 工具命名格式

适配器加载后，工具命名格式为 `mcp_{server}_{tool}`：

| 原始工具名 | 转换后名称 |
|-----------|-----------|
| `rh_upload_media` | `mcp_rhmcp_rh_upload_media` |
| `rh_execute_app` | `mcp_rhmcp_rh_execute_app` |
| `rh_query_task` | `mcp_rhmcp_rh_query_task` |
| `rh_add_app` | `mcp_rhmcp_rh_add_app` |
| `rh_remove_app` | `mcp_rhmcp_rh_remove_app` |
| `rh_update_rules` | `mcp_rhmcp_rh_update_rules` |
| `rh_list_rules` | `mcp_rhmcp_rh_list_rules` |
| `rh_get_app_info` | `mcp_rhmcp_rh_get_app_info` |

---

## 安全配置（可选）

适配器支持 `secret://` URI 方案避免明文存储凭证：

```json
{
  "env": {
    "RUNNINGHUB_API_KEY": "secret://env/RUNNINGHUB_API_KEY"
  }
}
```

支持的 secret 提供者：
- `secret://gcp/SECRET_NAME` - Google Cloud Secret Manager
- `secret://aws/SECRET_NAME` - AWS Secrets Manager
- `secret://vault/PATH` - HashiCorp Vault
- `secret://env/VAR_NAME` - 环境变量

---

## 故障排除

### MCP 服务器未启动

```
[MCP] Server rhmcp failed to start: Error: ...
```

**检查项**：
- 配置文件路径是否正确
- Node.js 版本 >= 18
- `dist/server/index.js` 文件是否存在

### 工具未出现在 Agent 中

**确认**：
1. 查看 OpenClaw 启动日志，确认 `Server rhmcp ready`
2. 检查 `openclaw.json` 格式是否正确
3. 确认使用的是 `amor71/openclaw-mcp` 而非官方 OpenClaw

### 崩溃后未自动重启

检查配置：
```json
{
  "restartOnCrash": true,
  "maxRestarts": 5
}
```

---

## 项目状态

`openclaw-mcp` 是社区贡献，实现完整但尚未合并到 OpenClaw 主仓库。

| 模块 | 状态 |
|------|------|
| 配置验证 | ✅ 完成 |
| 客户端生命周期 | ✅ 完成 |
| 工具桥接 | ✅ 完成 |
| 资源桥接 | ✅ 完成 |
| Secret 解析 | ✅ 完成 |
| 管理器 | ✅ 完成 |
| 集成测试 | ✅ 完成 |
| 安全测试 | ✅ 完成 |

测试覆盖：99+ 单元/集成测试