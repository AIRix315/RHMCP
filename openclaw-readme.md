# RHMCP OpenClaw 安装指南

## 前置要求

- OpenClaw 已安装并运行
- 已获取 RunningHub API Key（https://www.runninghub.cn）

## 一键安装

```bash
# 安装最新版
curl -fsSL https://raw.githubusercontent.com/AIRix315/RHMCP/main/install-openclaw.sh | bash

# 安装指定版本
curl -fsSL https://raw.githubusercontent.com/AIRix315/RHMCP/main/install-openclaw.sh | bash -s 1.1.1
```

安装脚本会：

1. 下载最新 Release 包到 `~/.rhmcp/`
2. 验证 SHA256 校验和
3. 创建默认配置文件
4. 复制模型规则文件
5. 输出 OpenClaw 配置片段

## 配置 OpenClaw

安装完成后，将以下配置添加到 `~/.openclaw/openclaw.json`：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": ["~/.rhmcp/dist/server/index.js", "--stdio"],
        "env": { "RHMCP_CONFIG": "~/.rhmcp" }
      }
    }
  },
  "skills": {
    "entries": {
      "rhmcp-skill": {
        "enabled": true,
        "path": "~/.rhmcp/skills/openclaw"
      }
    }
  }
}
```

> 将 `~/.rhmcp` 替换为实际安装路径。

## API Key 配置

创建 `~/.rhmcp/.env` 文件：

```bash
RUNNINGHUB_API_KEY=your_api_key_here
```

## 验证安装

重启 OpenClaw 后，确认日志显示：

```
[MCP] Server rhmcp ready, tools: 8
```

可用工具：

- `rh_upload_media` - 上传媒体文件
- `rh_get_app_info` - 获取 APP 信息
- `rh_execute_app` - 执行 APP 任务
- `rh_query_task` - 查询任务状态
- `rh_add_app` - 添加自定义 APP
- `rh_remove_app` - 移除 APP
- `rh_update_rules` - 更新模型规则
- `rh_validate_config` - 验证配置

## 安全校验

```bash
# 下载文件
curl -fsSL https://github.com/AIRix315/RHMCP/releases/latest/download/rhmcp-openclaw-VERSION.tar.gz -o rhmcp.tar.gz
curl -fsSL https://github.com/AIRix315/RHMCP/releases/latest/download/rhmcp-openclaw-VERSION.tar.gz.sha256 -o rhmcp.tar.gz.sha256

# 验证
sha256sum -c rhmcp.tar.gz.sha256

# 解压
tar -xzf rhmcp.tar.gz
```

## 故障排查

| 问题            | 解决                                                                  |
| --------------- | --------------------------------------------------------------------- |
| SHA256 校验失败 | 重新下载文件                                                          |
| APP 列表过期    | `node ~/.rhmcp/dist/server/index.js --update-apps ~/.rhmcp/apps.json` |
| 找不到 node     | OpenClaw 已内置 Node.js                                               |
| 模型规则缺失    | 确认 `~/.rhmcp/rules/` 目录存在                                       |

## 相关文档

- 项目文档：`README.md`
- 使用指南：`skills/openclaw/SKILL.md`
- 配置示例：`references/openclaw/mcp-config.json`

## License

MIT
