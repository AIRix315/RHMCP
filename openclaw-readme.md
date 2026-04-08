# RHMCP OpenClaw 安装指南

## 一键安装

```bash
# 安装最新版
curl -fsSL https://raw.githubusercontent.com/AIRix315/RHMCP/main/install-openclaw.sh | bash

# 安装指定版本
curl -fsSL https://raw.githubusercontent.com/AIRix315/RHMCP/main/install-openclaw.sh | bash -s 1.1.1
```

## 配置 OpenClaw

安装完成后，将以下配置添加到 `~/.openclaw/openclaw.json`：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": ["/home/user/.rhmcp/dist/server/index.js", "--stdio"],
        "env": { "RHMCP_CONFIG": "/home/user/.rhmcp" }
      }
    }
  },
  "skills": {
    "entries": {
      "rhmcp-skill": {
        "enabled": true,
        "path": "/home/user/.rhmcp/skills/openclaw"
      }
    }
  }
}
```

> 将 `/home/user/.rhmcp` 替换为实际安装路径（默认为 `~/.rhmcp`）。

## API Key 配置

创建 `~/.rhmcp/.env` 文件：

```bash
RUNNINGHUB_API_KEY=your_api_key_here
```

获取 API Key：https://www.runninghub.cn

## 安全校验

安装脚本自动验证 SHA256 校验和。

手动验证：

```bash
curl -fsSL https://github.com/AIRix315/RHMCP/releases/latest/download/rhmcp-openclaw-VERSION.tar.gz -o rhmcp.tar.gz
curl -fsSL https://github.com/AIRix315/RHMCP/releases/latest/download/rhmcp-openclaw-VERSION.tar.gz.sha256 -o rhmcp.tar.gz.sha256
sha256sum -c rhmcp.tar.gz.sha256
tar -xzf rhmcp.tar.gz
```

## 故障排查

| 问题            | 解决                                                                  |
| --------------- | --------------------------------------------------------------------- |
| SHA256 校验失败 | 重新下载文件                                                          |
| APP 列表过期    | `node ~/.rhmcp/dist/server/index.js --update-apps ~/.rhmcp/apps.json` |
| 找不到 node     | OpenClaw 已内置 Node.js                                               |

## License

MIT
