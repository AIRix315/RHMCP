# 用户添加 APP 指南

> 本文档指导用户如何添加自己发布的 APP 到 RHMCP 配置。

---

## 目录

1. [快速开始](#快速开始)
2. [获取 APP ID](#获取-app-id)
3. [最小配置](#最小配置)
4. [完整配置](#完整配置)
5. [添加到配置文件](#添加到配置文件)
6. [验证配置](#验证配置)
7. [常见问题](#常见问题)

---

## 快速开始

只需 **3 个字段** 即可添加 APP：

```json
{
  "appId": "2037760725296357377",
  "alias": "my-first-app",
  "category": "image"
}
```

---

## 获取 APP ID

### 方法 1：从 RunningHub 控制台获取

1. 登录 [RunningHub 控制台](https://www.runninghub.cn)（国内站）或 [RunningHub 国际站](https://www.runninghub.ai)
2. 进入「我的应用」→ 选择你的 APP
3. 在 APP 详情页找到 **APP ID**

### 方法 2：从 URL 获取

如果APP详情页 URL 为：

```
https://www.runninghub.cn/app/detail?appId=2037760725296357377
```

则 APP ID 为：`2037760725296357377`

---

## 最小配置

### 必填字段

| 字段       | 说明               | 示例                              |
| ---------- | ------------------ | --------------------------------- |
| `appId`    | APP 唯一标识       | `"2037760725296357377"`           |
| `alias`    | 调用别名（自定义） | `"my-text-to-image"`              |
| `category` | APP 类别           | `"image"` / `"audio"` / `"video"` |

### alias 命名建议

```
格式：<用途>-<变体>
示例：
- my-text-to-image      （我的文生图）
- logo-generator         （Logo 生成器）
- product-photo-enhance  （产品图增强）
```

**约束**：

- 仅小写字母、数字、连字符
- 长度 3-40 字符
- 避免使用特殊字符和空格

### category 选择

| 类别    | 适用场景                     |
| ------- | ---------------------------- |
| `image` | 图片生成、图片编辑、超分辨率 |
| `video` | 视频生成、视频编辑           |
| `audio` | 音乐生成、音效生成、语音处理 |

---

## 完整配置

如果需要更详细的配置（便于 Agent 筛选），可添加以下字段：

```json
{
  "appId": "2037760725296357377",
  "alias": "my-text-to-image",
  "category": "image",
  "modelName": "Qwen-001",
  "usageType": "文生图",
  "description": "我的自定义文生图。适用于：产品图、营销素材。",
  "mcpLevel": "full",
  "tags": ["chinese", "product", "marketing"]
}
```

### 可选字段说明

| 字段          | 说明           | 用途                 |
| ------------- | -------------- | -------------------- |
| `modelName`   | 底层模型名称   | 帮助 Agent 了解模型  |
| `usageType`   | 用途类型       | 场景匹配             |
| `description` | 功能描述       | 语义搜索             |
| `mcpLevel`    | MCP 兼容性等级 | 判断是否适合自动调用 |
| `tags`        | 能力标签数组   | 标签筛选             |

### mcpLevel 如何判断

| 等级      | 你的 APP 情况                            |
| --------- | ---------------------------------------- |
| `full`    | 所有输入参数都是文本或数字，无需上传文件 |
| `partial` | 需要上传图片、音频或视频作为输入         |
| `manual`  | 需要 GUI 操作或参数过于复杂              |

**不确定？** 建议使用 `partial`，这是最安全的选择。

---

## 添加到配置文件

### 步骤 1：打开配置文件

```bash
# 默认位置
~/.rhmcp/apps.json
```

### 步骤 2：添加到 user 部分

```json
{
  "server": {
    "_comment": "服务端预配置的APP，由平台维护"
  },
  "user": {
    "_comment": "用户自定义的APP配置",

    "my-text-to-image": {
      "appId": "2037760725296357377",
      "alias": "my-text-to-image",
      "category": "image"
    }
  }
}
```

### 步骤 3：保存文件

保存后，重启 MCP 客户端或重新运行 RHMCP。

---

## 验证配置

### 方法 1：使用验证工具

```bash
rhmcp --validate-config ~/.rhmcp/apps.json
```

### 方法 2：调用 get_app_info

在 MCP 客户端中调用：

```json
{
  "alias": "my-text-to-image"
}
```

如果返回 APP 详细信息，说明配置正确。

---

## 常见问题

### Q1: APP ID 填错了会怎样？

调用时会报错：`获取APP信息失败: APP不存在`。

**解决方法**：检查 APP ID 是否正确，确保账号有权限访问该 APP。

### Q2: alias 可以中文吗？

不建议。建议使用小写字母+数字+连字符，便于调用和避免编码问题。

### Q3: 添加后 Agent 找不到？

1. 确认配置文件路径正确（`~/.rhmcp/apps.json`）
2. 确认添加在 `user` 部分（不是 `server`）
3. 重启 MCP 客户端

### Q4: 如何删除已添加的 APP？

从 `apps.json` 的 `user` 部分删除对应条目即可。

### Q5: 可以覆盖 server 部分的 APP 吗？

可以。如果在 `user` 部分定义了与 `server` 同名alias，`user` 配置会优先生效。

---

## 示例：完整流程

### 场景：添加一个文生图 APP

**Step 1**: 从 RunningHub 获取 APP ID: `2037760725296357377`

**Step 2**: 编辑 `~/.rhmcp/apps.json`：

```json
{
  "server": {
    "_comment": "..."
  },
  "user": {
    "my-image-gen": {
      "appId": "2037760725296357377",
      "alias": "my-image-gen",
      "category": "image"
    }
  }
}
```

**Step 3**: 保存文件

**Step 4**: 在对话中使用：

```
用户：用my-image-gen 画一只猫
Agent：调用 rh_execute_app，alias: "my-image-gen"，params: {"text": "一只猫"}
```

---

## 相关文档

- [APP 发布规范](./APP_PUBLISHING_SPEC.md)
- [用户指南](./USER_GUIDE.md)
- [类型定义](../src/types.ts)
