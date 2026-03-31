import { z } from "zod";
import { RunningHubClient } from "../api/client.js";
import { RunningHubConfig, AppConfig, InputParam } from "../types.js";

const GetAppInfoSchema = z.object({
  appId: z.string().optional().describe("APP ID (可选，可通过别名查询)"),
  alias: z.string().optional().describe("APP别名 (可选，可通过ID查询)"),
});

/**
 * 自动处理类型（直接可通过 API 设置）
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

/**
 * 需要上传的类型
 */
const UPLOAD_TYPES = ["IMAGE", "AUDIO", "VIDEO", "ZIP"];

/**
 * 需要手动操作（GUI）的类型
 */
const MANUAL_TYPES = ["LAYER", "MASK", "TRAJECTORY", "STRUCT"];

/**
 * 从 fieldData 解析约束信息
 */
function parseFieldData(fieldData: string | undefined): Record<string, unknown> | undefined {
  if (!fieldData) return undefined;

  try {
    const parsed = JSON.parse(fieldData);

    // fieldData 格式: [type, options] 或 [[examples], options]
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
 * 计算参数的处理提示
 */
function calculateProcessHint(fieldType: string): "direct" | "upload" | "manual" {
  if (AUTO_TYPES.includes(fieldType)) return "direct";
  if (UPLOAD_TYPES.includes(fieldType)) return "upload";
  if (MANUAL_TYPES.includes(fieldType)) return "manual";
  return "direct";
}

/**
 * 解析 webappName 提取模型名称和用途
 */
function parseWebappName(webappName: string | undefined): {
  modelName?: string;
  usageType?: string;
} {
  if (!webappName) return {};

  // 格式: "AIRix [API] Qwen-001 文生图" 或类似
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

/**
 * 获取合并后的 APP 配置
 */
function getMergedApps(config: RunningHubConfig): Record<string, AppConfig> {
  // 优先使用新格式的 appsConfig
  if (config.appsConfig) {
    const merged: Record<string, AppConfig> = {};

    // 合并 server apps
    if (config.appsConfig.server) {
      for (const [alias, app] of Object.entries(config.appsConfig.server)) {
        if (!alias.startsWith("_")) {
          merged[alias] = app;
        }
      }
    }

    // 合并 user apps（覆盖 server 同名）
    if (config.appsConfig.user) {
      for (const [alias, app] of Object.entries(config.appsConfig.user)) {
        if (!alias.startsWith("_")) {
          merged[alias] = app;
        }
      }
    }

    return merged;
  }

  // 回退到旧格式
  return config.apps ?? {};
}

export const getAppInfoTool = {
  name: "rh_get_app_info",
  description: "获取APP的详细配置信息，包含参数列表、模型规则、约束条件",
  inputSchema: GetAppInfoSchema,

  async handler(
    args: z.infer<typeof GetAppInfoSchema>,
    client: RunningHubClient,
    config: RunningHubConfig
  ) {
    const apps = getMergedApps(config);

    // 1. 解析APP ID（支持别名）
    const appId = args.appId ?? apps[args.alias ?? ""]?.appId;
    if (!appId) {
      throw new Error("需要提供 appId 或有效的 alias");
    }

    // 2. 调用API
    const result = await client.getAppInfo(appId);

    if (result.code !== 0) {
      throw new Error(`获取APP信息失败: ${result.msg}`);
    }

    if (!result.data) {
      throw new Error("获取APP信息失败: 返回数据为空");
    }

    // 3. 解析 webappName
    const { modelName, usageType } = parseWebappName(result.data.webappName);

    // 4. 转换输入参数并用 nodeId 作为 key（确保唯一性）
    const inputs: Record<string, InputParam> = {};
    for (const node of result.data.nodeInfoList) {
      inputs[node.nodeId] = {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        fieldName: node.fieldName,
        type: node.fieldType,
        description: node.description,
        descriptionEn: node.descriptionEn,
        processHint: calculateProcessHint(node.fieldType),
        constraints: parseFieldData(node.fieldData),
      };
    }

    // 5. 返回完整配置
    return {
      appId: appId,
      webappName: result.data.webappName,
      modelName,
      usageType,
      description: result.data.description,
      inputs,
      nodeInfoList: result.data.nodeInfoList,
      covers: result.data.covers,
    };
  },
};
