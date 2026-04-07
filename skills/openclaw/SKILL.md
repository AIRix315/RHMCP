---
name: rhmcp-skill
description: RunningHub AI 智能调用。Use when user wants to generate images, videos, or audio content.
homepage: https://github.com/AIRix315/RHMCP
metadata:
  {
    "openclaw":
      {
        "emoji": "🎨",
        "requires": { "env": ["RUNNINGHUB_API_KEY"], "config": ["rhmcp.baseUrl"] },
        "primaryEnv": "RUNNINGHUB_API_KEY",
      },
  }
license: MIT-0
---

# RHMCP Skill - OpenClaw 专用

## 概述

RHMCP 的 OpenClaw Skill 包装层，提供智能 APP 选择和执行。

## 核心原则

**每次请求都从 apps.json 和 rules 查询匹配，不使用硬编码映射。**

---

## APP 选择流程

### 步骤 1: 分析用户请求

提取：

- **类别**：`image` / `video` / `audio`
- **关键词**：如 "4K"、"高清"、"数字人"、"中文"
- **编号/别名**（可选）：如 "002"、"qwen-text-to-image"

```
用户："生成4K美女图片"
→ 类别: image
→ 关键词: ["4K", "高清"]

用户："用002号生成图片"
→ 编号: 002
→ 类别: image（无关键词）

用户："生成一段配音"
→ 类别: audio
→ 关键词: ["配音", "语音"]
```

### 步骤 2: 查询匹配

```
1. 调用 rh_list_apps() 获取所有 APP
2. 加载 rules/*.json 获取模型能力
3. 匹配逻辑：
   - 有编号 → 直接按序号选择
   - 有别名 → 直接按别名选择
   - 有关键词 → 匹配 description + capabilities + useCases
   - 无关键词 → 返回该类别所有 APP 供用户选择
```

### 步骤 3: 执行或询问

| 匹配结果      | 处理                   |
| ------------- | ---------------------- |
| 单一匹配      | 直接执行               |
| 多个匹配      | 列出选项，询问用户选择 |
| 无匹配        | 报错，列出可用类别 APP |
| 指定编号/别名 | 直接执行               |

```
// 多个匹配时格式
找到 3 个匹配的 APP：
1. qwen-text-to-image: Qwen 文生图（匹配: 中文）
2. flux-text-to-image: FLUX 文生图（匹配: 高清）
3. sdxl-text-to-image: SDXL 文生图（匹配: 高清）
请选择编号或别名执行
```

---

## 执行参数

| 参数           | 来源               | 说明                |
| -------------- | ------------------ | ------------------- |
| `alias`        | 匹配结果           | APP 别名            |
| `params`       | 用户请求 + 默认值  | 参数填充            |
| `mode`         | 默认 `sync`        | 同步/异步           |
| `maxWaitTime`  | `executionProfile` | 从 description 解析 |
| `pollInterval` | `executionProfile` | 从 description 解析 |

---

## 轮询策略（从 APP 配置自动推断）

从 APP description 中解析：

- `生成时长15秒视频，时长约5分钟` → `estimatedDuration: 300s, pollInterval: 30s`

默认值（未配置时）：
| 类别 | 默认等待 | 默认间隔 |
|------|---------|---------|
| image | 60s | 5s |
| video | 600s | 30s |
| audio | 300s | 10s |

```javascript
// APP 自动推断
const app = apps["ltx23-digital-human"];
const maxWait = app.executionProfile?.estimatedDuration ?? defaults[category].maxWait;
const interval = app.executionProfile?.pollInterval ?? defaults[category].interval;
```

---

## 存储策略

| 步骤位置 | 存储模式  | 原因               |
| -------- | --------- | ------------------ |
| 中间步骤 | `none`    | URL 直接传递       |
| 最终输出 | `none`    | 返回 URL，用户保存 |
| 用户要求 | `network` | 用户明确要求保存   |

---

## 链式工作流

```javascript
// 步骤1：文生图
const img = await rh_execute_app({
  alias: "qwen-text-to-image", // 或用户选择的 APP
  params: { text: "一个女孩在樱花树下" },
});

// 步骤2：图生视频（匹配支持视频生成的 APP）
const video = await rh_execute_app({
  alias: "<匹配到的图生视频 APP>",
  params: {
    image: img.outputs[0].originalUrl,
    prompt: "樱花飘落，女孩转身微笑",
  },
});
```

---

## 错误码速查

| 错误码 | 含义     | 处理方式        |
| ------ | -------- | --------------- |
| `0`    | 成功     | 正常返回结果    |
| `804`  | 排队中   | 等待后轮询      |
| `805`  | 任务失败 | 调整提示词重试  |
| `813`  | 执行中   | 继续等待        |
| `421`  | 并发限制 | 等待 5 秒后重试 |

---

## 工具清单

| 工具              | 用途              |
| ----------------- | ----------------- |
| `rh_list_apps`    | 列出所有可用 APP  |
| `rh_get_app_info` | 获取 APP 参数详情 |
| `rh_execute_app`  | 执行 APP 任务     |
| `rh_query_task`   | 查询任务状态      |
| `rh_upload_media` | 上传媒体文件      |

---

## 关键词参考

### 类别识别

| 关键词                           | 类别  |
| -------------------------------- | ----- |
| 图片、图像、图、画、绘、4K、高清 | image |
| 视频、影、动画、数字人、口播     | video |
| 音频、语音、音乐、配音、TTS      | audio |

### 能力匹配

| 关键词         | 可能匹配的 capabilities/useCases |
| -------------- | -------------------------------- |
| 4K、高清、超分 | upscale, high-quality            |
| 中文、中文描述 | chinese, creative                |
| 数字人、口播   | digital-human, 口播              |
| 图生视频       | image-to-video                   |

---

## 故障排除

| 问题        | 原因         | 解决方案                            |
| ----------- | ------------ | ----------------------------------- |
| 未找到匹配  | 关键词不匹配 | 使用 `rh_list_apps` 查看可用 APP    |
| 多个匹配    | 关键词太泛   | 让用户指定编号或更具体的关键词      |
| apiKey 错误 | 未配置       | 在 `.env` 设置 `RUNNINGHUB_API_KEY` |
| 任务超时    | 执行时间长   | 使用 `mode: "async"`                |

---

## License

MIT-0
