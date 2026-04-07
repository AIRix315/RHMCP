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
用户请求 → 匹配场景词 → rh_get_app_info(alias) → 构建参数 → rh_execute_app
```

**关键：执行前必须调用 `rh_get_app_info(alias)` 获取必填参数和约束。**

## 场景词映射

| 用户说                     | 别名                           |
| -------------------------- | ------------------------------ |
| "生成图片"/"文生图"/"画画" | `qwen-text-to-image`           |
| "改图"/"修图"/"图生图"     | `qwen-image-to-image`          |
| "数字人视频"               | `infinite-digital-human`       |
| "图生视频"                 | `ltx23-first-last-frame-video` |
| 不确定时                   | 先调 `rh_list_apps()` 查看     |

## 工具说明

| 工具              | 用途             | 返回                                                  |
| ----------------- | ---------------- | ----------------------------------------------------- |
| `rh_list_apps`    | 查看所有可用 APP | `{ apps: [{ alias, appId, category, description }] }` |
| `rh_get_app_info` | 查询参数约束     | 见下方示例                                            |
| `rh_execute_app`  | 执行任务         | `{ taskId, status, outputs }`                         |
| `rh_query_task`   | 查询状态         | `{ status, outputs }`                                 |
| `rh_upload_media` | 上传文件         | `{ url }`                                             |

## rh_get_app_info 返回示例

```javascript
const appInfo = await rh_get_app_info({ alias: "qwen-text-to-image" });

// 返回结构：
{
  appId: "2037760725296357377",
  webappName: "AIRix [API] Qwen-001 文生图",
  usageType: "文生图",
  inputs: {
    "16": {
      nodeId: "16",
      fieldName: "text",
      type: "STRING",
      description: "Prompt",
      processHint: "direct",      // 直接传值
      constraints: { multiline: true }
    },
    "19": {
      nodeId: "19",
      fieldName: "value",
      type: "INT",
      description: "Width",
      processHint: "direct",
      constraints: { min: 512, max: 2048 }
    }
  }
}
```

## 如何构建参数

**从 `appInfo.inputs` 获取**：

- `type` → 参数类型（STRING/INT/FLOAT/IMAGE/AUDIO/VIDEO）
- `description` → 参数含义（用于友好提示）
- `processHint` → 处理方式（"direct"直接传值，"upload"需先上传）
- `constraints` → 值范围（min, max, step）

**构建示例**：

```javascript
// 1. 获取 APP 信息
const appInfo = await rh_get_app_info({ alias: "qwen-text-to-image" });

// 2. 构建 params（用 nodeId 作为 key）
const params = {
  16: "一只可爱的猫咪，动漫风格", // text (STRING)
  19: 1024, // width (INT)
  20: 1024, // height (INT)
};

// 或用 fieldName（兼容）
const params = {
  text: "一只可爱的猫咪，动漫风格",
  width: 1024,
  height: 1024,
};

// 3. 执行
const result = await rh_execute_app({
  alias: "qwen-text-to-image",
  params: params,
});
```

## 执行模式

| 任务类型             | 模式           |
| -------------------- | -------------- |
| 文生图等快速任务     | `sync`（默认） |
| 视频、数字人等长任务 | `async` + 轮询 |

```javascript
// 长任务用 async
const { taskId } = await rh_execute_app({
  alias: "infinite-digital-human",
  params: {
    /* 从 appInfo 获取 */
  },
  mode: "async",
});

// 轮询（间隔5秒，最多5分钟）
while (true) {
  const s = await rh_query_task({ taskId });
  if (s.status === "SUCCESS") return s;
  if (s.status === "FAILED") throw new Error(s.msg);
  await new Promise((r) => setTimeout(r, 5000));
}
```

## 错误处理

| 错误码       | 处理                     |
| ------------ | ------------------------ |
| `421/415`    | 并发限制，等 5 秒重试    |
| `804/813`    | 任务进行中，继续轮询     |
| `805`        | 任务失败，调参重试       |
| 未找到 alias | 调 `rh_list_apps()` 确认 |

## 链式调用

URL 直接传递：

```javascript
const img = await rh_execute_app({...});
const next = await rh_execute_app({
  params: { image: img.outputs[0].originalUrl }
});
```

## 参考

- `references/apps.json` — 完整 APP 配置
- `references/templates.json` — 预设模板
