# OpenClaw + RHMCP 测试清单

> ⚠️ **内部文档 - 不随生产发布**
>
> 此文档仅供开发者在集成测试阶段使用，用于验证 MCP 集成是否正常工作。
> 测试完成后无需保留。

---

> 请 OpenClaw Agent 按顺序执行以下测试，并记录每项结果

---

## 测试前准备

确保已完成：

- [ ] RHMCP 已构建（`npm run build`）
- [ ] `rhmcp-config.json` 已创建
- [ ] OpenClaw 配置已添加 MCP Server
- [ ] OpenClaw 已重启

---

## 测试清单

### T1: MCP Server 启动验证

**目的**：确认 OpenClaw 能启动 RHMCP

**操作**：重启 OpenClaw，查看日志或运行状态

**预期**：

- OpenClaw 正常启动
- 日志中无 MCP Server 错误

**结果记录**：

```
[ ] 通过
[ ] 失败 - 错误信息：
```

---

### T2: 列出可用工具

**目的**：确认 RHMCP 工具已注册

**操作**：让 Agent 列出可用的 MCP 工具

**预期**：看到以下工具：

- `rh_list_apps`
- `rh_get_app_info`
- `rh_execute_app`
- `rh_query_task`
- `rh_upload_media`

**结果记录**：

```
[ ] 通过 - 看到的工具：
[ ] 失败 - 缺少的工具：
```

---

### T3: 列出 APP

**目的**：测试 `rh_list_apps` 工具

**操作**：调用 `rh_list_apps`

**Agent 调用**：

```json
rh_list_apps({})
```

**预期**：返回 APP 列表，包含 `qwen-text-to-image` 和 `qwen-image-to-image`

**结果记录**：

```
[ ] 通过 - 返回内容：
[ ] 失败 - 错误信息：
```

---

### T4: 获取 APP 信息

**目的**：测试 `rh_get_app_info` 工具

**操作**：调用 `rh_get_app_info` 获取 APP 详情

**Agent 调用**：

```json
rh_get_app_info({ "alias": "qwen-text-to-image" })
```

**预期**：返回 APP 详细信息，包含 `inputs` 字段

**结果记录**：

```
[ ] 通过 - 返回内容：
[ ] 失败 - 错误信息：
```

---

### T5: 执行文生图（同步模式）

**目的**：测试 `rh_execute_app` 同步执行

**操作**：调用 `rh_execute_app` 生成图片

**Agent 调用**：

```json
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": {
    "text": "一只可爱的猫咪"
  }
})
```

**预期**：

- 返回 `status: "SUCCESS"`
- 返回 `outputs` 数组，包含 `originalUrl`

**结果记录**：

```
[ ] 通过 - taskId: , URL:
[ ] 失败 - 错误信息：
```

---

### T6: 执行文生图（异步模式）

**目的**：测试 `rh_execute_app` 异步执行

**操作**：

1. 以异步模式提交任务
2. 使用 `rh_query_task` 查询状态

**Agent 调用 1**：

```json
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": { "text": "风景画" },
  "mode": "async"
})
```

**预期 1**：返回 `{ "taskId": "xxx", "status": "PENDING" }`

**Agent 调用 2**（等待几秒后）：

```json
rh_query_task({ "taskId": "上一步返回的taskId" })
```

**预期 2**：返回 `{ "status": "SUCCESS", "outputs": [...] }`

**结果记录**：

```
[ ] 通过
[ ] 失败 - 步骤：
    - 提交任务结果：
    - 查询状态结果：
```

---

### T7: 错误处理验证

**目的**：测试错误情况的处理

**操作**：使用无效的 API Key 或错误的 APP ID

**Agent 调用**：

```json
rh_execute_app({
  "alias": "non-existent-app",
  "params": { "text": "test" }
})
```

**预期**：返回明确的错误信息，不崩溃

**结果记录**：

```
[ ] 通过 - 错误信息：
[ ] 失败 - 实际行为：
```

---

### T8: 环境变量传递

**目的**：确认 `CONFIG_PATH` 环境变量生效

**操作**：检查配置是否正确加载

**验证方法**：

- 修改 `rhmcp-config.json` 中的 `baseUrl` 为 `www.runninghub.ai`
- 执行 T3 或 T4
- 检查请求是否发送到正确的域名

**结果记录**：

```
[ ] 通过
[ ] 失败 - 说明：
```

---

### T9: 中文输入测试

**目的**：确认中文提示词正常工作

**操作**：使用中文生成图片

**Agent 调用**：

```json
rh_execute_app({
  "alias": "qwen-text-to-image",
  "params": { "text": "一只在草地上奔跑的金毛犬，阳光明媚" }
})
```

**预期**：成功生成图片

**结果记录**：

```
[ ] 通过 - URL:
[ ] 失败 - 错误：
```

---

### T10: 连续调用测试

**目的**：测试多次调用稳定性

**操作**：连续调用 3 次 `rh_list_apps`

**预期**：3 次都成功返回

**结果记录**：

```
[ ] 通过 - 3次成功
[ ] 失败 - 成功次数：，失败信息：
```

---

### T11: 图生图测试（可选）

**目的**：测试 `qwen-image-to-image` APP

**前提**：需要先上传图片或提供图片 URL

**Agent 调用**：

```json
rh_execute_app({
  "alias": "qwen-image-to-image",
  "params": {
    "image": "图片URL或上传后的路径",
    "prompt": "修改为水彩画风格"
  }
})
```

**结果记录**：

```
[ ] 通过
[ ] 跳过 - 原因：
[ ] 失败 - 错误：
```

---

## 测试结果汇总

测试完成后，请提供以下信息：

### 环境信息

| 项目          | 值                    |
| ------------- | --------------------- |
| 操作系统      | Windows / Linux / Mac |
| Node.js 版本  |                       |
| OpenClaw 版本 |                       |
| RHMCP 路径    |                       |

### 测试统计

| 状态 | 数量 |
| ---- | ---- |
| 通过 |      |
| 失败 |      |
| 跳过 |      |

### 问题详情

对于失败的测试项，请详细描述：

```
测试编号：
错误信息：
复现步骤：
日志片段（如有）：
```

---

## 反馈地址

请将测试结果反馈：

- GitHub Issue: https://github.com/AIRix315/RHMCP/issues
- 或直接在此文档中填写结果
