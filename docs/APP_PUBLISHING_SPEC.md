# APP 发布规范

> 本文档定义了 RHMCP 公共 APP 列表的发布标准和字段规范。
>
> **适用对象**：RHMCP 维护者、RunningHub 工作流发布者

---

## 目录

1. [概述](#概述)
2. [元信息字段标准](#元信息字段标准)
3. [MCP 兼容性等级](#mcp-兼容性等级)
4. [字段填写指南](#字段填写指南)
5. [最佳实践示例](#最佳实践示例)
6. [完整配置示例](#完整配置示例)

---

## 概述

RHMCP 的公共 APP 列表位于 `references/apps.json`，通过 `rhmcp --update-apps` 命令同步到用户配置。

本文档目的：

- 确保 APP 元信息完整、准确
- 便于 AI Agent 自动筛选和调用
- 提供统一的发布参考标准

---

## 元信息字段标准

### 字段分级

| 分级     | 含义           | 要求         |
| -------- | -------------- | ------------ |
| **必填** | 核心标识信息   | 必须提供     |
| **推荐** | 增强筛选和描述 | 强烈建议提供 |
| **自动** | 从 API 获取    | 无需手动填写 |
| **可选** | 补充信息       | 按需提供     |

### 必填字段

| 字段          | 类型   | 说明                    | 约束                                          |
| ------------- | ------ | ----------------------- | --------------------------------------------- |
| `appId`       | string | RunningHub APP 唯一标识 | 数字字符串，如 `"2037760725296357377"`        |
| `alias`       | string | 调用别名                | 小写字母+数字+连字符，如 `qwen-text-to-image` |
| `category`    | enum   | APP 类别                | `"image"` / `"audio"` / `"video"`             |
| `modelName`   | string | 底层模型名称            | 如 `"Qwen-001"`、`"SDXL"`、`"Flux"`           |
| `usageType`   | string | 用途类型                | 简短描述，如 `"文生图"`、`"提示词改图"`       |
| `description` | string | 功能描述                | 50字以内，包含适用场景                        |
| `mcpLevel`    | enum   | MCP 兼容性等级          | `"full"` / `"partial"` / `"manual"`           |

### 推荐字段

| 字段           | 类型     | 说明           | 用途               |
| -------------- | -------- | -------------- | ------------------ |
| `tags`         | string[] | 能力标签       | 标签筛选、语义匹配 |
| `capabilities` | object   | 详细能力描述   | 智能推荐           |
| `default`      | boolean  | 是否推荐为默认 | 同类 APP 中的首选  |

#### capabilities 子字段

```typescript
interface AppCapabilities {
  strengths?: string[]; // 优势，如 ["中文理解强", "创意生成"]
  bestFor?: string[]; // 最佳用途，如 ["创意插图", "概念设计"]
  limitations?: string[]; // 限制，如 ["不支持超高清"]
  speed?: "fast" | "medium" | "slow"; // 生成速度
  quality?: "low" | "medium" | "high" | "ultra"; // 输出质量
}
```

### 自动填充字段

| 字段         | 来源            | 说明         |
| ------------ | --------------- | ------------ |
| `inputs`     | API `/app/info` | 输入参数配置 |
| `covers`     | API `/app/info` | 效果预览图   |
| `webappName` | API `/app/info` | 平台完整名称 |

### 可选字段

| 字段          | 类型     | 说明                       |
| ------------- | -------- | -------------------------- |
| `modelFamily` | string   | 模型系列，用于自动导入规则 |
| `outputs`     | string[] | 输出类型列表               |
| `constraints` | object   | 参数约束覆盖               |

---

## MCP 兼容性等级

`mcpLevel` 是 AI Agent 判断 APP 是否适合自动调用的关键依据。

### 等级定义

| 等级      | 定义                | 典型场景               | Agent 行为                 |
| --------- | ------------------- | ---------------------- | -------------------------- |
| `full`    | 所有参数可自动处理  | 纯文本输入的生图       | 直接调用，无需额外交互     |
| `partial` | 部分参数需特殊处理  | 需上传参考图的图生图   | 先调用上传工具，再执行     |
| `manual`  | 需要 GUI 或复杂配置 | 多步骤工作流、轨迹编辑 | 仅返回信息，不建议自动调用 |

### 判定指南

```
full 的条件：
- 所有输入参数类型为 STRING / INT / FLOAT / LIST / SWITCH
- 无需上传文件（IMAGE / AUDIO / VIDEO）
- 无需 GUI 操作（LAYER / MASK / TRAJECTORY）

partial 的条件：
- 部分参数需要上传文件
- 其他参数可自动处理

manual 的条件：
- 需要 GUI 操作
- 参数过于复杂（如结构化输入）
- 已被淘汰或稳定性不足
```

### 参数类型与处理方式

| 类型         | 处理方式     | mcpLevel 影响 |
| ------------ | ------------ | ------------- |
| `STRING`     | 直接传值     | ✅ full       |
| `INT`        | 直接传值     | ✅ full       |
| `FLOAT`      | 直接传值     | ✅ full       |
| `LIST`       | 从选项中选择 | ✅ full       |
| `SWITCH`     | 布尔值       | ✅ full       |
| `IMAGE`      | 需先上传     | ⚠️ partial    |
| `AUDIO`      | 需先上传     | ⚠️ partial    |
| `VIDEO`      | 需先上传     | ⚠️ partial    |
| `LAYER`      | 需要 GUI     | ❌ manual     |
| `MASK`       | 需要 GUI     | ❌ manual     |
| `TRAJECTORY` | 需要 GUI     | ❌ manual     |

---

## 字段填写指南

### ⚠️ description 字段规范（关键）

**重要性**：description 是 AI Agent 区分同名参数的唯一依据！

当多个参数的 `fieldName` 相同时（如多个`value`或`text`），Agent 只能通过 `description` 来区分。因此，**description 必须语义化且唯一**。

#### 命名原则

✅ **好的示例**：

- `"Width"` / `"Height"` — 尺寸参数，清晰区分
- `"AudioPrompt"` / `"VideoPrompt"` — 不同用途的提示词
- `"RefImage"` / `"OutputImage"` — 输入输出区分
- `"UpRefAudio"` / `"OutputAudio"` — 上传参考与输出区分

❌ **不好的示例**：

- `"value1"` / `"value2"` — 无语义编号
- `"text"` / `"text2"` — 纯编号，Agent 无法理解用途
- `"param1"` / `"param2"` — 通用命名，缺乏描述

#### 命名建议格式

| 参数类型 | 推荐命名           | 示例                                                             |
| -------- | ------------------ | ---------------------------------------------------------------- |
| 尺寸     | `Width` / `Height` | `"Width"`, `"Height"`                                            |
| 提示词   | 用途+Prompt        | `"Prompt"`, `"AudioPrompt"`, `"VideoPrompt"`, `"NegativePrompt"` |
| 图片输入 | 用途+Image         | `"RefImage"`, `"InputImage"`, `"ActorImage"`                     |
| 音频输入 | 用途+Audio         | `"RefAudio"`, `"InputAudio"`                                     |
| 上传文件 | Up+类型            | `"UpImage"`, `"UpAudio"`, `"UpVideo"`                            |

#### Agent 参数匹配机制

```
Agent 调用参数匹配顺序：
1. 精确匹配 nodeId（内部唯一标识）
2. 匹配 description（推荐方式）
3. 匹配 fieldName（兼容模式，仅当唯一时有效）

建议：发布 APP 时确保 description 清晰唯一，方便 Agent 理解和使用
```

#### 实际案例

**问题案例**（fieldName 冲突）：

```json
{
  "inputs": {
    "text": { "fieldName": "text", "description": "AudioPrompt" },
    "text": { "fieldName": "text", "description": "VideoPrompt" } // 覆盖！
  }
}
```

**正确做法**（description 区分）：

```json
{
  "inputs": {
    "250": { "nodeId": "250", "fieldName": "text", "description": "AudioPrompt" },
    "209": { "nodeId": "209", "fieldName": "text", "description": "VideoPrompt" }
  }
}
```

Agent 可以通过 `description` 正确匹配：

- 用户说 "设置音频提示词" → Agent搜索包含 "Audio" 的 description → 找到 nodeId=250

---

### alias 命名规范

```
格式：<模型名>-<用途>-<变体>
示例：
- qwen-text-to-image     （Qwen 文生图）
- qwen-image-to-image     （Qwen 图生图）
- sdxl-text-to-image      （SDXL 文生图）
- flux-1-dev-fast         （Flux 快速模式）
```

**约束**：

- 仅小写字母、数字、连字符
- 长度 3-40 字符
- 避免使用版本号（除非是核心特性）
- 同一用途的不同模型用模型名区分

### description 填写规范

```
格式：<模型名> <用途>。适用于：<场景1>、<场景2>。

示例：
- Qwen 文生图。适用于：中文描述、创意插图。
- SDXL 高质量生图。适用于：写实风格、超高清输出。
- Flux 快速生图。适用于：快速原型、批量生成。

原则：
1. 简洁（建议 30-50 字）
2. 说明核心能力
3. 包含 2-3 个适用场景
4. 便于 Agent 语义匹配
```

### tags 填写规范

```
分类：
- 语言特性：chinese, english, multilingual
- 生成类型：text-to-image, image-to-image, style-transfer
- 风格：realistic, creative, anime, oil-painting
- 能力：fast, high-resolution, batch
- 模型系列：flux, sdxl, sd15, qwen

示例：
- ["chinese", "creative", "text-to-image"]
- ["realistic", "high-resolution", "sdxl"]
- ["fast", "style-transfer", "image-to-image"]
```

### usageType 常用值

| 类别     | 常用值                                                   |
| -------- | -------------------------------------------------------- |
| 图片生成 | 文生图、图生图、提示词改图、风格迁移、超分辨率、局部重绘 |
| 视频生成 | 文生视频、图生视频、视频风格化                           |
| 音频处理 | 文生音乐、音效生成、语音合成                             |

---

## 最佳实践示例

### 示例 1：纯文本生图（full 级别）

```json
{
  "appId": "2037760725296357377",
  "alias": "qwen-text-to-image",
  "category": "image",
  "modelName": "Qwen-001",
  "usageType": "文生图",
  "description": "Qwen 文生图。适用于：中文描述、创意插图。",
  "mcpLevel": "full",
  "tags": ["chinese", "creative", "text-to-image"],
  "capabilities": {
    "strengths": ["中文理解强", "创意生成"],
    "bestFor": ["创意插图", "概念设计"],
    "speed": "fast",
    "quality": "medium"
  },
  "default": true
}
```

### 示例 2：图生图（partial 级别）

```json
{
  "appId": "2037822548796252162",
  "alias": "qwen-image-to-image",
  "category": "image",
  "modelName": "Qwen003",
  "usageType": "提示词改图",
  "description": "Qwen 提示词改图。适用于：图像风格转换、局部修改。",
  "mcpLevel": "partial",
  "tags": ["chinese", "image-editing", "style-transfer"],
  "capabilities": {
    "strengths": ["提示词理解强", "风格转换"],
    "bestFor": ["图像修改", "风格迁移"],
    "speed": "medium"
  }
}
```

### 示例 3：复杂工作流（manual 级别）

```json
{
  "appId": "2038XXXXXXXXXXXXXXX",
  "alias": "complex-workflow-example",
  "category": "image",
  "modelName": "Custom",
  "usageType": "多步骤工作流",
  "description": "示例：复杂多步骤工作流，仅供演示。",
  "mcpLevel": "manual",
  "tags": ["demo-only"],
  "capabilities": {
    "limitations": ["需要手动配置", "参数复杂"]
  }
}
```

---

## 完整配置示例

以下是 `references/apps.json` 的完整示例：

```json
{
  "server": {
    "_updated": "2026-03-31T00:00:00Z",
    "_source": "https://raw.githubusercontent.com/AIRix315/RHMCP/main/references/apps.json",

    "qwen-text-to-image": {
      "appId": "2037760725296357377",
      "alias": "qwen-text-to-image",
      "category": "image",
      "modelName": "Qwen-001",
      "usageType": "文生图",
      "description": "Qwen 文生图。适用于：中文描述、创意插图。",
      "mcpLevel": "full",
      "inputs": { "...": "从 API 自动填充" },
      "tags": ["chinese", "creative", "text-to-image"],
      "capabilities": {
        "strengths": ["中文理解强", "创意生成"],
        "bestFor": ["创意插图", "概念设计"],
        "speed": "fast",
        "quality": "medium"
      },
      "default": true
    },

    "qwen-image-to-image": {
      "appId": "2037822548796252162",
      "alias": "qwen-image-to-image",
      "category": "image",
      "modelName": "Qwen003",
      "usageType": "提示词改图",
      "description": "Qwen 提示词改图。适用于：图像风格转换、局部修改。",
      "mcpLevel": "partial",
      "inputs": { "...": "从 API 自动填充" },
      "tags": ["chinese", "image-editing", "style-transfer"],
      "capabilities": {
        "strengths": ["提示词理解强", "风格转换"],
        "bestFor": ["图像修改", "风格迁移"],
        "speed": "medium"
      }
    }
  },
  "user": {
    "_comment": "用户自定义的 APP 配置放在这里"
  }
}
```

---

## 附录

### 相关文档

- [用户添加 APP 指南](./USER_ADD_APP_GUIDE.md)
- [类型定义](../src/types.ts)
- [Schema 定义](../src/schemas/app-config.ts)

### 更新日志

| 日期       | 版本 | 变更     |
| ---------- | ---- | -------- |
| 2026-03-31 | 1.0  | 初始版本 |
