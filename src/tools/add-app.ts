import { z } from "zod";
import { RunningHubClient } from "../api/client.js";
import { AppConfig } from "../types.js";
import { validateUserApp } from "../schemas/app-config.js";

/**
 * 用户添加 APP 的输入 Schema
 *
 * 最小配置只需 3 个字段：appId, alias, category
 * 其他字段从 API 自动获取。
 *
 * @see docs/USER_ADD_APP_GUIDE.md 用户添加APP指南
 */
const AddAppSchema = z.object({
  appId: z
    .string()
    .regex(/^\d+$/, "APP ID 必须为数字字符串")
    .describe("RunningHub APP ID（数字字符串）"),

  alias: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/, "别名必须为 3-40 位小写字母、数字或连字符")
    .describe("APP 调用别名（小写字母+数字+连字符）"),

  category: z.enum(["image", "audio", "video"]).describe("APP 类别：image/audio/video"),

  modelFamily: z
    .string()
    .optional()
    .describe("模型系列（可选，用于自动导入规则，如 'flux', 'sdxl'）"),
});

/**
 * APP 处理类型分类
 */
const AUTO_TYPES = [
  "STRING",
  "INT",
  "FLOAT",
  "SWITCH",
  "LIST",
  "LORA",
  "CHECKPOINT",
  "MODEL",
  "CLIP",
  "VAE",
  "EMBEDDING",
];

const UPLOAD_TYPES = ["IMAGE", "AUDIO", "VIDEO", "ZIP"];

const MANUAL_TYPES = ["LAYER", "MASK", "TRAJECTORY", "STRUCT"];

/**
 * 计算参数的处理提示
 */
function calculateProcessHint(fieldType: string): "direct" | "upload" | "manual" {
  if (AUTO_TYPES.includes(fieldType)) return "direct";
  if (UPLOAD_TYPES.includes(fieldType)) return "upload";
  if (MANUAL_TYPES.includes(fieldType)) return "manual";
  return "direct";
}

/**
 * 从 fieldData 解析约束信息
 */
function parseFieldData(fieldData: string | undefined): Record<string, unknown> | undefined {
  if (!fieldData) return undefined;

  try {
    const parsed = JSON.parse(fieldData);

    if (Array.isArray(parsed) && parsed.length >= 2) {
      const options = parsed[1];
      if (typeof options === "object" && options !== null) {
        const constraints: Record<string, unknown> = {};

        if (typeof options.min === "number") constraints.min = options.min;
        if (typeof options.max === "number") constraints.max = options.max;
        if (typeof options.step === "number") constraints.step = options.step;
        if (typeof options.multiline === "boolean") constraints.multiline = options.multiline;
        if (typeof options.dynamicPrompts === "boolean")
          constraints.dynamicPrompts = options.dynamicPrompts;
        if (typeof options.image_upload === "boolean")
          constraints.image_upload = options.image_upload;
        if (typeof options.control_after_generate === "boolean")
          constraints.control_after_generate = options.control_after_generate;

        return Object.keys(constraints).length > 0 ? constraints : undefined;
      }
    }
  } catch {
    // 解析失败，忽略
  }

  return undefined;
}

/**
 * 根据 inputs 计算 mcpLevel
 */
function calculateMcpLevel(
  inputs: Record<string, { type: string }>
): "full" | "partial" | "manual" {
  let hasUpload = false;
  let hasManual = false;

  for (const input of Object.values(inputs)) {
    if (MANUAL_TYPES.includes(input.type)) {
      hasManual = true;
    } else if (UPLOAD_TYPES.includes(input.type)) {
      hasUpload = true;
    }
  }

  if (hasManual) return "manual";
  if (hasUpload) return "partial";
  return "full";
}

/**
 * 解析 webappName 提取模型名称和用途
 */
function parseWebappName(webappName: string | undefined): {
  modelName?: string;
  usageType?: string;
} {
  if (!webappName) return {};

  // 格式: "AIRix [API] Qwen-001 文生图"
  const match = webappName.match(/\[API\]\s*(.+?)\s+(.+)$/);
  if (match) {
    return {
      modelName: match[1].trim(),
      usageType: match[2].trim(),
    };
  }

  // 尝试提取中文用途
  const chineseUsage = webappName.match(/[\u4e00-\u9fa5]+$/);
  if (chineseUsage) {
    return { usageType: chineseUsage[0] };
  }

  return {};
}

export const addAppTool = {
  name: "rh_add_app",
  description: "注册新 APP，自动获取参数配置。返回完整配置供用户添加到 apps.json 的 user 部分。",
  inputSchema: AddAppSchema,

  async handler(
    args: z.infer<typeof AddAppSchema>,
    client: RunningHubClient,
    _configPathOrConfig?: string | { apps: Record<string, AppConfig> }
  ) {
    // 1. 验证输入
    const validation = validateUserApp(args);
    if (!validation.success) {
      throw new Error(`参数验证失败: ${validation.errors?.join(", ")}`);
    }

    // 2. 从 API 获取 APP 详细信息
    const result = await client.getAppInfo(args.appId);
    if (result.code !== 0) {
      throw new Error(`获取APP信息失败: ${result.msg}`);
    }

    if (!result.data) {
      throw new Error("获取APP信息失败: 返回数据为空");
    }

    // 3. 解析 webappName
    const { modelName, usageType } = parseWebappName(result.data.webappName);

    // 4. 构建 inputs 配置（用 nodeId 作为 key，确保唯一性）
    const inputs: Record<string, AppConfig["inputs"][string]> = {};
    let hasUploadParam = false;

    for (const node of result.data.nodeInfoList) {
      const fieldType = node.fieldType;
      const processHint = calculateProcessHint(fieldType);

      if (processHint === "upload") {
        hasUploadParam = true;
      }

      inputs[node.nodeId] = {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        fieldName: node.fieldName,
        type: fieldType,
        description: node.description,
        descriptionEn: node.descriptionEn,
        default: node.fieldValue,
        processHint,
        constraints: parseFieldData(node.fieldData),
      };
    }

    // 5. 自动计算 mcpLevel（如果用户未指定）
    const mcpLevel = calculateMcpLevel(inputs);

    // 6. 构建完整 AppConfig
    const appConfig: AppConfig = {
      appId: args.appId,
      alias: args.alias,
      category: args.category,
      modelFamily: args.modelFamily,
      modelName,
      usageType,
      description: result.data.description,
      mcpLevel,
      inputs,
      webappName: result.data.webappName,
      covers: result.data.covers,
    };

    // 7. 返回完整配置供用户确认和添加
    return {
      success: true,
      /** 完整的 APP 配置，可直接添加到 apps.json */
      appConfig,
      /** 导入的参数数量 */
      importedInputs: Object.keys(inputs).length,
      /** MCP 兼容性等级 */
      mcpLevel,
      /** 是否有需要上传的参数 */
      hasUploadParam,
      /** 提示信息 */
      hints: generateHints(appConfig),
    };
  },
};

/**
 * 生成提示信息
 */
function generateHints(config: AppConfig): string[] {
  const hints: string[] = [];

  hints.push(`请将以下配置添加到 apps.json 的 user 部分：`);
  hints.push(`"user": { "${config.alias}": ${JSON.stringify(config, null, 2)} }`);

  if (config.mcpLevel === "partial") {
    hints.push(`注意: 此 APP 需要上传文件，请先使用 rh_upload_media 上传后再调用。`);
  } else if (config.mcpLevel === "manual") {
    hints.push(`注意: 此 APP 有复杂参数，建议在 RunningHub 平台手动配置。`);
  }

  return hints;
}
