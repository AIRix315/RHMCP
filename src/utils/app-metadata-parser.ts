/**
 * APP 元数据解析器
 *
 * 从 description 中提取模型名称、执行时间等信息
 *
 * 支持格式：
 * - 模型:LTX23
 * - 模型：LTX23（中文冒号）
 * - 生成时长15秒视频，时长约5分钟
 * - 生成时长: 15秒视频，时长: 约5分钟
 */

import type { ExecutionProfile } from "../types.js";

export interface ParsedMetadata {
  /** 模型系列，如 "LTX23"、"qwen-image" */
  modelFamily?: string;
  /** 执行参数配置 */
  executionProfile?: ExecutionProfile;
}

/**
 * 去除 HTML 标签
 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 解析 description 提取元数据
 */
export function parseAppMetadata(description: string): ParsedMetadata {
  const result: ParsedMetadata = {};

  if (!description) {
    return result;
  }

  // 去除 HTML 标签
  const cleanText = stripHtml(description);

  // 提取模型名称：模型:LTX23 或 模型：LTX23
  const modelMatch = cleanText.match(/模型[:：]\s*(\S+)/);
  if (modelMatch) {
    result.modelFamily = modelMatch[1].trim();
  }

  // 提取时长信息
  const durationMatch = cleanText.match(/生成时长[:：]?\s*(\d+)\s*秒/);
  const timeMatch = cleanText.match(/时长[:：]?约?\s*(\d+)\s*分钟/);

  if (durationMatch && timeMatch) {
    const outputDuration = parseInt(durationMatch[1], 10);
    const waitMinutes = parseInt(timeMatch[1], 10);
    const estimatedDuration = waitMinutes * 60;

    // 根据输出时长推断轮询间隔
    // 视频类（>60秒）间隔长，图片类间隔短
    const pollInterval = outputDuration > 60 ? 30 : 10;

    result.executionProfile = {
      estimatedDuration,
      outputDuration,
      timeRatio: Math.round((estimatedDuration / outputDuration) * 100) / 100,
      pollInterval,
    };
  }

  return result;
}

/**
 * 从 webappName 解析模型和用途
 * 格式：AIRix [API] Qwen-001 文生图
 * 或：AIRix [API] 042 LTX23 图生视频
 */
export function parseWebappName(webappName: string): {
  modelName?: string;
  usageType?: string;
} {
  if (!webappName) {
    return {};
  }

  // 格式: "AIRix [API] Qwen-001 文生图" 或 "AIRix [API] 042 LTX23 图生视频"
  const match = webappName.match(/\[API\]\s*(\d+)?\s*(.+?)\s+(.+)$/);
  if (match) {
    // match[2] 可能是数字编号，也可能是模型名
    const part2 = match[2].trim();
    const part3 = match[3].trim();

    // 如果 part2 是纯数字，模型名在 part3 开头
    if (/^\d+$/.test(part2)) {
      // 格式: AIRix [API] 042 LTX23 图生视频
      // 需要从 part3 中分离模型名和用途
      const modelMatch = part3.match(/^(\S+)\s+(.+)$/);
      if (modelMatch) {
        return {
          modelName: modelMatch[1],
          usageType: modelMatch[2],
        };
      }
      return {
        modelName: part3,
        usageType: "",
      };
    } else {
      // 格式: AIRix [API] Qwen-001 文生图
      return {
        modelName: part2,
        usageType: part3,
      };
    }
  }

  // 尝试提取中文用途
  const chineseUsage = webappName.match(/[\u4e00-\u9fa5]+$/);
  if (chineseUsage) {
    return { usageType: chineseUsage[0] };
  }

  return {};
}

/**
 * 从 APP 信息提取完整元数据
 */
export function extractAppMetadata(appInfo: {
  webappName?: string;
  description?: string;
}): ParsedMetadata & { modelName?: string; usageType?: string } {
  const result: ParsedMetadata & { modelName?: string; usageType?: string } = {};

  // 解析 description
  const parsed = parseAppMetadata(appInfo.description || "");
  Object.assign(result, parsed);

  // 解析 webappName
  const { modelName, usageType } = parseWebappName(appInfo.webappName || "");
  if (modelName) {
    result.modelName = modelName;
    // 如果 description 没提供 modelFamily，从 modelName 推断
    if (!result.modelFamily && modelName) {
      // 尝试匹配已知模型系列
      const normalizedModel = modelName.toLowerCase().replace(/[-_]/g, "");
      if (normalizedModel.includes("qwen")) {
        result.modelFamily = "qwen-image";
      } else if (normalizedModel.includes("ltx")) {
        result.modelFamily = "ltx23";
      } else if (normalizedModel.includes("flux")) {
        result.modelFamily = "flux";
      } else if (normalizedModel.includes("sdxl")) {
        result.modelFamily = "sdxl";
      } else if (normalizedModel.includes("sd") || normalizedModel.includes("stable")) {
        result.modelFamily = "sd15";
      }
    }
  }
  if (usageType) {
    result.usageType = usageType;
  }

  return result;
}
