#!/usr/bin/env node
/**
 * APP 兼容性检查工具
 *
 * 用法：
 *   rhmcp --check-app <appId>
 *
 * 分析 APP 的输入参数，判断 MCP 兼容性等级：
 *   - full: 完全兼容（所有参数都是自动处理类型）
 *   - partial: 部分兼容（需要上传媒体文件）
 *   - manual: 不兼容（需要手动 GUI 操作）
 */

import { RunningHubClient } from "../api/client.js";
import { NodeInfo, InputParam, InputConstraints, AppConfig, CoverInfo } from "../types.js";

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
function parseFieldData(fieldData: string | undefined): InputConstraints | undefined {
  if (!fieldData) return undefined;

  try {
    const parsed = JSON.parse(fieldData);

    // fieldData 格式: [type, options] 或 [[examples], options]
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const options = parsed[1];
      if (typeof options === "object" && options !== null) {
        const constraints: InputConstraints = {};

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
        if (typeof options.default !== "undefined") {
          // default 值放在 constraints 中也保留
        }

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

  // 未知类型，假设可以直接处理
  return "direct";
}

/**
 * 计算 MCP 兼容性等级
 */
function calculateMcpLevel(inputs: Record<string, InputParam>): "full" | "partial" | "manual" {
  const types = Object.values(inputs).map((i) => i.type);

  if (types.some((t) => MANUAL_TYPES.includes(t))) return "manual";
  if (types.some((t) => UPLOAD_TYPES.includes(t))) return "partial";
  return "full";
}

/**
 * 从 webappName 提取模型名称和用途
 */
function parseWebappName(webappName: string | undefined): {
  modelName?: string;
  usageType?: string;
} {
  if (!webappName) return {};

  // 格式: "AIRix [API] Qwen-001 文生图" 或类似
  // 提取模型名和用途
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
 * 将 NodeInfo 转换为 InputParam
 */
function nodeToInputParam(node: NodeInfo): InputParam {
  const constraints = parseFieldData(node.fieldData);

  return {
    nodeId: node.nodeId,
    nodeName: node.nodeName,
    fieldName: node.fieldName,
    type: node.fieldType,
    description: node.description,
    descriptionEn: node.descriptionEn,
    processHint: calculateProcessHint(node.fieldType),
    constraints,
  };
}

/**
 * 检查结果
 */
interface CheckResult {
  appId: string;
  webappName?: string;
  modelName?: string;
  usageType?: string;
  inputs: Record<string, InputParam>;
  mcpLevel: "full" | "partial" | "manual";
  recommendation: string;
  covers?: CoverInfo[];
}

/**
 * 检查 APP 兼容性
 */
export async function checkApp(appId: string, client: RunningHubClient): Promise<CheckResult> {
  // 1. 获取 APP 信息
  const result = await client.getAppInfo(appId);

  if (result.code !== 0) {
    throw new Error(`获取 APP 信息失败: ${result.msg}`);
  }

  if (!result.data) {
    throw new Error("获取 APP 信息失败: 返回数据为空");
  }

  // 2. 转换输入参数
  const inputs: Record<string, InputParam> = {};
  for (const node of result.data.nodeInfoList) {
    const param = nodeToInputParam(node);
    // 使用 fieldName 作为 key（更直观）
    inputs[param.fieldName] = param;
  }

  // 3. 解析 webappName
  const { modelName, usageType } = parseWebappName(result.data.webappName);

  // 4. 计算 MCP 兼容性
  const mcpLevel = calculateMcpLevel(inputs);

  // 5. 生成建议
  let recommendation: string;
  if (mcpLevel === "full") {
    recommendation = "✅ 完全兼容 MCP，可自动处理所有参数";
  } else if (mcpLevel === "partial") {
    const uploadParams = Object.entries(inputs)
      .filter(([, p]) => p.processHint === "upload")
      .map(([name, p]) => `${name} (${p.type})`)
      .join(", ");
    recommendation = `⚠️ 部分兼容，需要上传: ${uploadParams}`;
  } else {
    const manualParams = Object.entries(inputs)
      .filter(([, p]) => p.processHint === "manual")
      .map(([name, p]) => `${name} (${p.type})`)
      .join(", ");
    recommendation = `❌ 不兼容 MCP，需要手动操作: ${manualParams}`;
  }

  return {
    appId,
    webappName: result.data.webappName,
    modelName,
    usageType,
    inputs,
    mcpLevel,
    recommendation,
    covers: result.data.covers?.map((c) => ({
      id: c.id || "",
      url: c.url,
      thumbnailUri: c.thumbnailUri,
      imageWidth: c.imageWidth,
      imageHeight: c.imageHeight,
    })),
  };
}

/**
 * 格式化输出检查结果
 */
export function formatCheckResult(result: CheckResult): string {
  const lines: string[] = [];

  lines.push(`检查 APP: ${result.appId}`);
  lines.push("");

  if (result.webappName) {
    lines.push(`名称: ${result.webappName}`);
  }
  if (result.modelName) {
    lines.push(`模型: ${result.modelName}`);
  }
  if (result.usageType) {
    lines.push(`用途: ${result.usageType}`);
  }
  lines.push("");

  lines.push("输入参数:");
  for (const [name, param] of Object.entries(result.inputs)) {
    const required = param.constraints?.image_upload ? " [需上传]" : "";
    const hint = param.processHint === "direct" ? "✓" : param.processHint === "upload" ? "↑" : "✗";
    lines.push(`  ${hint} ${name} (${param.type})${required}`);
    if (param.description) {
      lines.push(`      描述: ${param.description}`);
    }
    if (param.constraints) {
      const constraintStrs: string[] = [];
      if (param.constraints.min !== undefined) constraintStrs.push(`min: ${param.constraints.min}`);
      if (param.constraints.max !== undefined) constraintStrs.push(`max: ${param.constraints.max}`);
      if (param.constraints.multiline) constraintStrs.push("多行");
      if (param.constraints.dynamicPrompts) constraintStrs.push("动态提示词");
      if (constraintStrs.length > 0) {
        lines.push(`      约束: ${constraintStrs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push(`兼容性等级: ${result.mcpLevel.toUpperCase()}`);
  lines.push(`建议: ${result.recommendation}`);

  return lines.join("\n");
}

/**
 * 从检查结果生成 AppConfig
 */
export function createAppConfigFromResult(
  result: CheckResult,
  alias: string,
  category: "image" | "audio" | "video"
): AppConfig {
  return {
    appId: result.appId,
    alias,
    category,
    webappName: result.webappName,
    modelName: result.modelName,
    usageType: result.usageType,
    inputs: result.inputs,
    mcpLevel: result.mcpLevel,
    covers: result.covers,
    description: result.usageType,
  };
}
