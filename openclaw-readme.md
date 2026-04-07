# RHMCP OpenClaw 安装指南

## 一键安装

```bash
# 安装最新版
curl -fsSL https://raw.githubusercontent.com/AIRix315/RHMCP/main/install-openclaw.sh | bash

# 安装指定版本
curl -fsSL https://raw.githubusercontent.com/AIRix315/RHMCP/main/install-openclaw.sh | bash -s 1.1.1
```

## 安全校验

安装脚本自动验证 SHA256 校验和。

手动验证：

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

| 问题            | 解决                                               |
| --------------- | -------------------------------------------------- |
| SHA256 校验失败 | 重新下载文件                                       |
| APP 列表过期    | `node ~/.rhmcp/dist/server/index.js --update-apps` |
| 找不到 node     | OpenClaw 已内置 Node.js                            |

## 获取 API Key

https://www.runninghub.cn

## License

MIT
