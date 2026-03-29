# OpenCode MCP 配置指南

OpenCode 原生支持 MCP，配置后 Agent 自动发现所有工具。

---

## 配置位置

| 平台 | 路径 |
|------|------|
| Windows | `%USERPROFILE%\.config\opencode\opencode.json` |
| macOS/Linux | `~/.config/opencode/opencode.json` |

---

## 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定值 `"local"` |
| `command` | array | ✅ | 启动命令数组 |
| `environment` | object | ❌ | 环境变量 |

---

## 配置示例

### 方式一：使用构建输出

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["node", "/完整路径/RHMCP/dist/server/index.js", "--stdio"],
      "environment": {
        "CONFIG_PATH": "/完整路径/RHMCP/rhmcp-config.json"
      }
    }
  }
}
```

### 方式二：使用全局命令

> 前提：已执行 `npm link` 全局安装

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["rhmcp", "--stdio"],
      "environment": {
        "CONFIG_PATH": "/完整路径/RHMCP/rhmcp-config.json"
      }
    }
  }
}
```

---

## CLI 命令方式

### Windows PowerShell

```powershell
$env:CONFIG_PATH = "E:\Projects\RHMCP\rhmcp-config.json"
opencode mcp set rhmcp '{"type":"local","command":["rhmcp","--stdio"]}'
```

### Linux/macOS

```bash
CONFIG_PATH=/path/to/rhmcp-config.json opencode mcp set rhmcp '{"type":"local","command":["rhmcp","--stdio"]}'
```

---

## 验证

```bash
opencode mcp list

# 预期输出：
# SERVER    STATUS    TOOLS
# rhmcp     running   8
```

---

## 可用工具

配置成功后，Agent 可直接使用：

| 工具 | 说明 |
|------|------|
| `rh_upload_media` | 上传媒体文件 |
| `rh_get_app_info` | 获取 APP 配置 |
| `rh_execute_app` | 执行 APP 任务 |
| `rh_query_task` | 查询任务状态 |
| `rh_add_app` | 注册新 APP |
| `rh_remove_app` | 移除 APP |
| `rh_update_rules` | 更新模型规则 |
| `rh_list_rules` | 列出可用规则 |

---

## 故障排除

### MCP 连接失败

- 检查 JSON 格式是否正确
- 确认路径使用绝对路径
- Windows 路径使用 `/` 或 `\\` 分隔符

### 找不到命令

```bash
# 全局安装
npm link

# 验证
rhmcp --help
```

### 配置文件未加载

- 重启 OpenCode
- 检查配置文件路径是否正确