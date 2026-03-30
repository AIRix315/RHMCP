# OpenClaw + RHMCP 使用指南

> 本指南面向 OpenClaw Agent，说明如何配置和使用 RHMCP 访问 RunningHub 平台。

---

## 一、快速配置

### 1.1 前置条件

- Node.js 18+ 
- RunningHub API Key（从 https://www.runninghub.cn 获取）
- OpenClaw 已安装

### 1.2 安装 RHMCP

```bash
# 克隆并构建
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP
npm install
npm run build

# 记录完整路径（后续配置需要）
# Windows: cd → 显示路径如 E:\Projects\RHMCP
# Linux/Mac: pwd → 显示路径如 /home/user/RHMCP
```

### 1.3 创建配置文件

在 RHMCP 目录创建 `rhmcp-config.json`：

```json
{
  "apiKey": "YOUR_API_KEY_HERE",
  "baseUrl": "www.runninghub.cn",
  "maxConcurrent": 1,
  "storage": {
    "mode": "none"
  },
  "apps": {
    "qwen-text-to-image": {
      "appId": "2037760725296357377",
      "alias": "qwen-text-to-image",
      "category": "image",
      "description": "Qwen文生图"
    },
    "qwen-image-to-image": {
      "appId": "2037822548796252162",
      "alias": "qwen-image-to-image",
      "category": "image",
      "description": "Qwen图生图"
    }
  }
}
```

### 1.4 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`，添加 MCP Server：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": [
          "E:/Projects/RHMCP/dist/server/index.js",
          "--stdio"
        ],
        "env": {
          "CONFIG_PATH": "E:/Projects/RHMCP/rhmcp-config.json"
        }
      }
    }
  }
}
```

**注意**：
- 路径必须使用**绝对路径**
- Windows 路径用 `/` 或 `\\`（不要用单个 `\`）
- 重启 OpenClaw 使配置生效

---

## 二、可用工具

| 工具 | 用途 |
|------|------|
| `rh_list_apps` | 列出所有已配置的 APP |
| `rh_get_app_info` | 获取 APP 详细信息 |
| `rh_execute_app` | 执行 APP 生成内容 |
| `rh_query_task` | 查询任务状态 |
| `rh_upload_media` | 上传媒体文件 |

---

## 三、使用示例

### 3.1 列出可用 APP

```
用户: 查看可用的 RunningHub APP

Agent 调用:
rh_list_apps({})

返回:
{
  "apps": [
    { "alias": "qwen-text-to-image", "category": "image", "description": "Qwen文生图" },
    { "alias": "qwen-image-to-image", "category": "image", "description": "Qwen图生图" }
  ]
}
```

### 3.2 文生图

```
用户: 生成一张可爱的猫咪图片

Agent 调用:
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": {
    "text": "一只可爱的猫咪，卡通风格"
  }
})

返回:
{
  "taskId": "123456",
  "status": "SUCCESS",
  "outputs": [
    {
      "originalUrl": "https://www.runninghub.cn/xxx/image.png"
    }
  ]
}
```

### 3.3 查询任务状态（异步模式）

```
Agent 调用:
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": { "text": "风景画" },
  "mode": "async"
})

返回:
{
  "taskId": "123456",
  "status": "PENDING"
}

# 稍后查询
Agent 调用:
rh_query_task({ "taskId": "123456" })
```

---

## 四、常见问题

### Q1: MCP Server 不启动

**症状**：调用工具无响应或报错 "server not found"

**检查**：
1. 路径是否为绝对路径
2. Node.js 版本是否 18+
3. `npm run build` 是否成功

**解决**：
```bash
# 验证 RHMCP 可独立运行
cd E:\Projects\RHMCP
node dist/server/index.js --stdio

# 应输出 MCP 协议握手信息
```

### Q2: API Key 无效

**症状**：返回 "apiKey is required" 或 401 错误

**检查**：
1. `rhmcp-config.json` 中 `apiKey` 是否正确
2. API Key 是否已激活

**解决**：
- 登录 RunningHub 控制台确认 API Key 状态
- 确认 baseUrl 正确（国内站 `www.runninghub.cn`，国际站 `www.runninghub.ai`）

### Q3: 任务超时

**症状**：返回 "任务超时"

**解决**：
- 部分任务执行时间较长，使用 `mode: "async"` 异步模式
- 在配置中增加 `retry.maxWaitTime`

### Q4: 环境变量未生效

**症状**：配置了 `CONFIG_PATH` 但不生效

**检查**：
```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "env": {
          "CONFIG_PATH": "E:/Projects/RHMCP/rhmcp-config.json"  // 必须绝对路径
        }
      }
    }
  }
}
```

### Q5: 中文乱码

**解决**：确保配置文件和终端使用 UTF-8 编码

---

## 五、配置参考

### baseUrl 选择

| 域名 | 适用场景 |
|------|----------|
| `www.runninghub.cn` | 国内站，服务器在中国 |
| `www.runninghub.ai` | 国际站，服务器在海外 |

### storage 模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `none` | 返回 RunningHub URL | OpenClaw 默认推荐 |
| `local` | 下载到本地 | 需要保存文件 |
| `auto` | Agent 自动判断 | 复杂场景 |

---

## 六、获取帮助

- RHMCP 仓库：https://github.com/AIRix315/RHMCP
- 问题反馈：GitHub Issues
- RunningHub 平台：https://www.runninghub.cn