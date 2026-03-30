# RHMCP

[![CI](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/AIRix315/RHMCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **RHMCP** - RunningHub AI Platform MCP Server - 让 AI Agent 调用生图、视频生成、音频处理等功能。

---

## 文档导航

| 客户端             | 文档                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **OpenCode**       | [配置指南](docs/OpenCode-setup.md)                                                                    |
| **OpenClaw**       | [配置指南](docs/OpenClaw-setup.md) → [快速指南](docs/openclaw/GUIDE.md) → [FAQ](docs/openclaw/FAQ.md) |
| **Claude Desktop** | 参考 OpenCode 配置                                                                                    |
| **通用**           | [用户指南](docs/USER_GUIDE.md)                                                                        |

---

## 快速开始

```bash
# 克隆并构建
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build

# 创建配置
cp service.json.example service.json
cp apps.json.example apps.json
echo "RUNNINGHUB_API_KEY=your_api_key" > .env

# 验证安装
node dist/server/index.js --stdio
```

---

## 配置要点

| 配置项       | 说明                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| **baseUrl**  | `auto`（自动检测）、`www.runninghub.cn`（国内站）、`www.runninghub.ai`（国际站） |
| **API Key**  | 从 [RunningHub 控制台](https://www.runninghub.cn) 获取                           |
| **环境变量** | `RHMCP_CONFIG` 指向配置**目录**                                                  |

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

## 开发

```bash
npm run dev        # HTTP 模式
npm run dev:stdio  # STDIO 模式
npm test           # 运行测试
```

---

## 许可证

MIT License
