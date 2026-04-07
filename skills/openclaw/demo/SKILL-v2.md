---
name: rhmcp-skill
description: RunningHub AI 智能调用。当用户要生成图片、视频、音频，或提到"文生图"、"改图"、"数字人"时触发。
homepage: https://github.com/AIRix315/RHMCP
metadata:
  openclaw:
    emoji: "🎨"
    requires:
      env: ["RUNNINGHUB_API_KEY"]
    primaryEnv: "RUNNINGHUB_API_KEY"
license: MIT-0
---

# RHMCP Skill

RunningHub AI 平台调用。支持文生图、图生图、视频、数字人、音频等。

## 核心流程

```
用户请求 → 分析需求 → 选择APP → 查询参数约束 → 执行任务
               │           │            │
               ↓           ↓            ↓
         场景词匹配   rh_list_apps   rh_get_app_info
         能力对比     能力标签        必填参数
```

**关键：执行前必须调用 `rh_get_app_info(alias)` 获取必填参数和约束。**

---

## 第一步：分析用户需求

### 需求关键词识别

| 关键词             | 暗示需求 | 示例                                    |
| ------------------ | -------- | --------------------------------------- |
| "4K"/"高清"/"超大" | 高分辨率 | "生成4K猫咪" → 选择 upscale APP         |
| "快"/"急"          | 速度优先 | "快点出图" → 选择 speed=fast 的 APP     |
| "高质量"/"精细"    | 质量优先 | "要高质量" → 选择 quality=high 的 APP   |
| "改图"/"修图"      | 图生图   | "把这张图改成..." → 选择 image-to-image |

---

## 第二步：选择 APP

### 文生图 APP 选择策略

| 用户需求          | 推荐 APP                           | 原因                               |
| ----------------- | ---------------------------------- | ---------------------------------- |
| 默认/快速出图     | `qwen-text-to-image`               | speed=fast，默认选项               |
| 高清/4K/高质量    | `qwen-text-to-image-upscale`       | quality=high，high-resolution 标签 |
| 修改图片/风格迁移 | `qwen-image-to-image`              | image-editing，风格转换            |
| 不确定            | 先调 `rh_list_apps()` 查看能力标签 |

**如何查看 APP 能力**：

```javascript
const apps = await rh_list_apps();
// 返回格式：
// {
//   apps: [
//     { alias: "qwen-text-to-image", capabilities: { speed: "fast", quality: "medium" }, tags: ["chinese"] },
//     { alias: "qwen-text-to-image-upscale", capabilities: { speed: "medium", quality: "high" }, tags: ["high-resolution"] }
//   ]
// }
```

### 数字人 APP 选择策略

| 用户需求                   | 推荐 APP                            | 必填参数                                                 |
| -------------------------- | ----------------------------------- | -------------------------------------------------------- |
| 一键生成数字人（需要配音） | `infinite-digital-human-integrated` | 音频 + 图片 + AudioPrompt + VideoPrompt + Width + Height |
| 已有音频（无需配音）       | `infinite-digital-human`            | 音频 + 图片 + VideoPrompt + Width + Height               |

**注意：所有数字人 APP 都需要参考图（image）**。

---

## 第三步：查询参数约束

```javascript
const appInfo = await rh_get_app_info({ alias: "qwen-text-to-image-upscale" });

// 返回结构示例：
{
  appId: "2038131610033332226",
  usageType: "文生图+SedX2放大",
  description: "Qwen002 文生图+SedX2放大。适用于：高清生成、细节增强。",
  inputs: {
    "20": {
      fieldName: "text",
      type: "STRING",
      description: "Prompt",
      processHint: "direct",      // "direct"=直接传值, "upload"=需上传
      constraints: { multiline: true }
    },
    "5": {
      fieldName: "value",
      type: "INT",
      description: "Width",
      processHint: "direct",
      constraints: { min: 512, max: 4096 }  // 分辨率约束
    }
  }
}
```

---

## 第四步：处理必填参数

### 如何处理 `processHint`

| processHint | 含义     | 处理方式                                                                 |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `"direct"`  | 直接传值 | `params: { text: "描述", width: 1024 }`                                  |
| `"upload"`  | 需上传   | 先调 `rh_upload_media({ file })` 获取 URL，再传 `params: { image: url }` |

### 数字人必填参数处理

```javascript
// 场景：用户要生成数字人视频

// 1. 询问确认
confirm("数字人视频需要以下材料：\n" +
        "1. 参考图片（人物形象）\n" +
        "2. 音频文件（或使用TTS文本生成）\n" +
        "3. 动作描述（可选）\n" +
        "您已准备好哪些？");

// 2. 根据用户选择 APP
if (用户有预录音频) {
  alias = "infinite-digital-human";  // 纯数字人
  需要参数 = ["audio", "image", "videoPrompt"];
} else if (用户需要配音) {
  alias = "infinite-digital-human-integrated";  // 集成TTS
  需要参数 = ["audio", "text", "image", "videoPrompt"];
}

// 3. 构建 params
const params = {};
if (需要 "audio") {
  const { url } = await rh_upload_media({ file: 音频文件 });
  params.audio = url;
}
if (需要 "image") {
  const { url } = await rh_upload_media({ file: 图片文件 });
  params.image = url;
}
```

---

## 智能询问逻辑

### 何时主动询问？

| 用户请求     | 缺少信息       | 应该询问                                       |
| ------------ | -------------- | ---------------------------------------------- |
| "生成4K猫咪" | 分辨率需求确认 | "4K需要使用高清模型，生成会更慢，确定要4K吗？" |
| "生成数字人" | 参考图 + 音频  | "需要：1)人物图片 2)音频文件。请上传。"        |
| "改图"       | 输入图片       | "请提供要修改的图片URL或上传文件。"            |
| "视频放大"   | 原视频 + 倍数  | "请上传视频并指定放大倍数（如2x、4x）。"       |

### 询问模板

```javascript
// 通用询问函数
function askMissingParams(appInfo) {
  const required = [];
  for (const [nodeId, input] of Object.entries(appInfo.inputs)) {
    if (input.processHint === "upload") {
      required.push(`${input.description}（需要上传）`);
    }
  }

  if (required.length > 0) {
    return `此APP需要以下必填参数：\n${required.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n请提供相关文件。`;
  }
}
```

---

## 场景词映射

| 用户说              | 类别     | 可能的 APP                                                    |
| ------------------- | -------- | ------------------------------------------------------------- |
| "生成图片"/"文生图" | 文生图   | `qwen-text-to-image`, `qwen-text-to-image-upscale`            |
| "改图"/"修图"       | 图生图   | `qwen-image-to-image`                                         |
| "数字人"            | 数字人   | `infinite-digital-human`, `infinite-digital-human-integrated` |
| "图生视频"          | 视频     | `ltx23-first-last-frame-video`                                |
| "视频放大"          | 视频处理 | `rtxvsr-video-upscale`                                        |
| 不确定              | -        | 先调 `rh_list_apps()`                                         |

---

## 工具说明

| 工具              | 用途             | 返回                                        |
| ----------------- | ---------------- | ------------------------------------------- |
| `rh_list_apps`    | 查看所有可用 APP | `{ apps: [{ alias, capabilities, tags }] }` |
| `rh_get_app_info` | 查询参数约束     | `{ appId, usageType, inputs }`              |
| `rh_execute_app`  | 执行任务         | `{ taskId, status, outputs }`               |
| `rh_query_task`   | 查询状态         | `{ status, outputs }`                       |
| `rh_upload_media` | 上传文件         | `{ url }`                                   |

---

## 执行模式

| 任务类型             | 模式           |
| -------------------- | -------------- |
| 文生图等快速任务     | `sync`（默认） |
| 视频、数字人等长任务 | `async` + 轮询 |

```javascript
// 长任务用 async
const { taskId } = await rh_execute_app({
  alias: "infinite-digital-human",
  params: { ... },
  mode: "async"
});

// 轮询
while (true) {
  const s = await rh_query_task({ taskId });
  if (s.status === "SUCCESS") return s;
  if (s.status === "FAILED") throw new Error(s.msg);
  await new Promise(r => setTimeout(r, 5000));
}
```

---

## 错误处理

| 错误码       | 处理                     |
| ------------ | ------------------------ |
| `421/415`    | 并发限制，等 5 秒重试    |
| `804/813`    | 任务进行中，继续轮询     |
| `805`        | 任务失败，调参重试       |
| 未找到 alias | 调 `rh_list_apps()` 确认 |

---

## 参考

- `references/apps.json` — 完整 APP 配置和能力标签
- `references/templates.json` — 预设模板
