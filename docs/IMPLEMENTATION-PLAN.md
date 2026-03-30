# RunningHub 生态系统实施计划

> 目标：建设完善的 APP 生态系统，让 Agent 能智能选择合适的 APP

---

## 状态：Phase 1 已完成 ✅

---

## 一、四层架构

| 层面                | 主体                      | 职责                           | 产出物               |
| ------------------- | ------------------------- | ------------------------------ | -------------------- |
| **开发环境**        | 你（仓库维护者）          | APP 兼容性检查、服务端列表维护 | 检查工具、apps.json  |
| **使用环境**        | 客户（OpenCode/OpenClaw） | 获取已验证 APP 列表            | `--update-apps`      |
| **RunningHub 平台** | APP 源                    | 创建符合 MCP 要求的 APP        | APP ID               |
| **GitHub**          | 分发                      | 发布权威 APP 列表              | references/apps.json |

---

## 二、已实现的类型扩展

### 2.1 InputParam 扩展 ✅

```typescript
interface InputParam {
  nodeId: string;
  nodeName?: string; // 新增：节点名称
  fieldName: string;
  type: string; // 改为动态类型
  description?: string;
  descriptionEn?: string; // 新增：英文描述
  default?: string | number;
  options?: string[];
  processHint?: "direct" | "upload" | "manual"; // 新增：处理提示
  constraints?: InputConstraints; // 新增：解析后的约束
}

interface InputConstraints {
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
  dynamicPrompts?: boolean;
  image_upload?: boolean;
  control_after_generate?: boolean;
}
```

### 2.2 AppConfig 扩展 ✅

```typescript
interface AppConfig {
  appId: string;
  alias: string;
  modelFamily?: string;
  category: "image" | "audio" | "video";
  description?: string;
  webappName?: string; // 新增：API 返回的完整名称
  modelName?: string; // 新增：提取的模型名
  usageType?: string; // 新增：提取的用途
  covers?: CoverInfo[]; // 新增：效果预览图
  inputs: Record<string, InputParam>;
  outputs?: string[];
  constraints?: Record<string, Constraint>;
  capabilities?: AppCapabilities; // 新增
  tags?: string[]; // 新增
  mcpLevel?: "full" | "partial" | "manual"; // 新增
  default?: boolean; // 新增
}
```

### 2.3 CoverInfo 和 AppCapabilities ✅

```typescript
interface CoverInfo {
  id: string;
  url: string;
  thumbnailUri: string;
  imageWidth?: string;
  imageHeight?: string;
}

interface AppCapabilities {
  strengths?: string[];
  bestFor?: string[];
  limitations?: string[];
  speed?: "fast" | "medium" | "slow";
  quality?: "low" | "medium" | "high" | "ultra";
}
```

---

## 三、已实现的 CLI 工具 ✅

### 3.1 `rhmcp --check-app <appId>`

检查 APP 的 MCP 兼容性：

```bash
rhmcp --check-app 2037760725296357377
```

输出示例：

```
检查 APP: 2037760725296357377

名称: AIRix [API] Qwen-001 文生图
模型: Qwen-001
用途: 文生图

输入参数:
  ✓ text (STRING)
      描述: Prompt
      约束: 多行, 动态提示词
  ✓ width (INT)
      描述: Width
      约束: min: -9223372036854775807, max: 9223372036854775807
  ✓ height (INT)
      描述: High

兼容性等级: FULL
建议: ✅ 完全兼容 MCP，可自动处理所有参数
```

---

## 四、类型分类与兼容性 ✅

| 类型                                   | 自动化程度  | processHint | MCP 兼容性 |
| -------------------------------------- | ----------- | ----------- | ---------- |
| STRING, INT, FLOAT, SWITCH, LIST, LORA | ✅ 完全自动 | `direct`    | full       |
| IMAGE, AUDIO, VIDEO, ZIP               | ⚠️ 需上传   | `upload`    | partial    |
| LAYER, MASK, TRAJECTORY, STRUCT        | ❌ 需手动   | `manual`    | 不兼容     |

---

## 五、后续工作

- [ ] Phase 2: RHSkill 重构为 MCP 适配器（参考 E:\Projects\RHSkill）
- [ ] Phase 3: 智能 APP 选择逻辑
- [ ] Phase 4: 偏好学习功能

---

## 六、关键文件

- `src/types.ts` - 核心类型定义
- `src/cli/check-app.ts` - APP 兼容性检查工具
- `src/tools/get-app-info.ts` - 增强 APP 信息获取
- `references/apps.json` - APP 列表示例
