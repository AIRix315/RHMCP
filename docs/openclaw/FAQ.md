# OpenClaw + RHMCP 常见问题

---

## 配置问题

### Q1: MCP Server 不启动

**症状**: 调用工具无响应或报错 "server not found"

**检查**:

1. 路径是否为**绝对路径**
2. Node.js 版本是否 >= 18
3. `npm run build` 是否成功
4. `RHMCP_CONFIG` 是否指向**目录**而非文件

**验证方式**:

```bash
cd E:\Projects\RHMCP
node dist/server/index.js --stdio
# 应输出 MCP 协议握手信息，无报错
```

### Q2: API Key 无效

**症状**: 返回 "apiKey is required" 或 401 错误

**检查**:

1. `.env` 文件中 `RUNNINGHUB_API_KEY` 是否正确
2. API Key 是否已激活（登录 RunningHub 控制台确认）
3. `baseUrl` 是否正确匹配账号归属

**baseUrl 对照**:
| 域名 | 适用账号 |
|------|---------|
| `www.runninghub.cn` | 国内站注册的账号 |
| `www.runninghub.ai` | 国际站注册的账号 |

### Q3: 环境变量未生效

**症状**: 配置了 `RHMCP_CONFIG` 但不生效

**正确配置**:

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "env": {
          "RHMCP_CONFIG": "E:/Projects/RHMCP" // 目录，非文件
        }
      }
    }
  }
}
```

### Q4: 旧配置格式兼容性

**症状**: 启动时提示 "检测到旧版配置格式"

**说明**: RHMCP 支持两种配置格式：

- **新格式**: `service.json` + `apps.json` + `.env`
- **旧格式**: `rhmcp-config.json`（仍支持，但会提示迁移）

**迁移命令**:

```bash
rhmcp --migrate
```

---

## 使用问题

### Q5: 任务超时

**症状**: 返回 "任务超时"

**解决**:

- 使用异步模式：`mode: "async"`
- 在 `service.json` 中增大 `retry.maxWaitTime`（默认 600 秒）

### Q6: 中文乱码

**解决**: 确保配置文件和终端使用 UTF-8 编码

### Q7: 工具名称不匹配

**症状**: OpenClaw 中工具名称带有前缀

**说明**: 这是正常现象，OpenClaw 会添加 `mcp_{server}_` 前缀：

| RHMCP 工具       | OpenClaw 工具名            |
| ---------------- | -------------------------- |
| `rh_execute_app` | `mcp_rhmcp_rh_execute_app` |
| `rh_query_task`  | `mcp_rhmcp_rh_query_task`  |

---

## 平台问题

### Q8: 如何获取 API Key

1. 访问 [RunningHub](https://www.runninghub.cn) 注册账号
2. 进入「个人中心」→「API 控制台」
3. 创建并复制 API Key

### Q9: 共享 APP ID 用于测试

运行以下命令获取官方共享 APP 列表：

```bash
rhmcp --update-apps
```

| APP ID                | 别名                  | 类型   |
| --------------------- | --------------------- | ------ |
| `2037760725296357377` | `qwen-text-to-image`  | 文生图 |
| `2037822548796252162` | `qwen-image-to-image` | 图生图 |

---

## 其他问题

### Q10: 如何查看可用 APP

Agent 可通过资源查询：

```
# MCP 资源路径
rh://apps
```

或调用工具：

```
rh_get_app_info({ "alias": "qwen-text-to-image" })
```

### Q11: 如何升级 RHMCP

```bash
cd RHMCP
git pull
npm install
npm run build
# 重启 OpenClaw
```

---

如有其他问题，请提交 [GitHub Issue](https://github.com/AIRix315/RHMCP/issues)。
