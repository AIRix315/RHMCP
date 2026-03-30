# OpenClaw + RHMCP 快速指南

> 让 OpenClaw Agent 能够调用 RunningHub AI 平台的生图、视频生成等功能。

---

## 一、部署 RHMCP

### 1.1 克隆并构建

```bash
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build
```

### 1.2 创建配置文件

**创建 `.env`**（存放 API Key）：

```bash
echo "RUNNINGHUB_API_KEY=your_api_key_here" > .env
```

**创建 `service.json`**：

```json
{
  "baseUrl": "auto",
  "maxConcurrent": 1,
  "storage": { "mode": "none" }
}
```

> `baseUrl` 选择：`auto`（自动检测）、`www.runninghub.cn`（国内站）、`www.runninghub.ai`（国际站）

**创建 `apps.json`**（运行 `rhmcp --update-apps` 自动填充官方 APP）

### 1.3 验证安装

```bash
node dist/server/index.js --stdio
```

正常启动无报错即成功。

---

## 二、配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`（Windows: `%USERPROFILE%\.openclaw\openclaw.json`）：

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
  }
}
```

**关键点**：

- `args` 使用绝对路径
- `RHMCP_CONFIG` 指向配置**目录**（非文件）
- Windows 路径用 `/` 或 `\\`

重启 OpenClaw 使配置生效。

---

## 三、使用工具

启动后，RHMCP 工具会自动注册到 OpenClaw。

### 可用工具

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

### 示例：文生图

```
用户: 生成一张可爱的猫咪图片

Agent 调用:
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": { "text": "一只可爱的猫咪，卡通风格" }
})

返回:
{
  "taskId": "xxx",
  "status": "SUCCESS",
  "outputs": [{ "originalUrl": "https://..." }]
}
```

### 示例：异步模式

长时间任务使用异步模式：

```
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": { "text": "风景画" },
  "mode": "async"
})

# 返回 taskId，稍后查询
rh_query_task({ "taskId": "xxx" })
```

---

## 四、获取帮助

- **RHMCP 仓库**: https://github.com/AIRix315/RHMCP
- **常见问题**: [FAQ.md](./FAQ.md)
- **RunningHub 平台**: https://www.runninghub.cn
