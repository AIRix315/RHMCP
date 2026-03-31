/**
 * APP 配置 Zod Schema
 *
 * 用于验证 AI Agent 和用户添加的 APP 配置。
 *
 * @example
 * // 用户添加APP（最小配置）
 * const userApp = UserAppConfigSchema.parse({
 *   appId: "2037760725296357377",
 *   alias: "my-text-to-image",
 *   category: "image"
 * });
 *
 * // 服务端完整配置
 * const serverApp = ServerAppConfigSchema.parse({ ... });
 */

import { z } from "zod";

// ============================================
// 基础 Schema
// ============================================

/**
 * APP 类别
 */
export const CategorySchema = z.enum(["image", "audio", "video"]).describe("APP 类别");

/**
 * MCP 兼容性等级
 *
 * - full: 所有参数可自动处理，Agent 可直接调用
 * - partial: 部分参数需上传文件或特殊处理
 * - manual: 需要 GUI 操作或复杂参数，建议用户手动使用
 */
export const McpLevelSchema = z.enum(["full", "partial", "manual"]).describe("MCP 兼容性等级");

/**
 * 生成速度等级
 */
export const SpeedSchema = z.enum(["fast", "medium", "slow"]).optional().describe("生成速度");

/**
 * 输出质量等级
 */
export const QualitySchema = z
  .enum(["low", "medium", "high", "ultra"])
  .optional()
  .describe("输出质量");

/**
 * APP 能力描述
 */
export const AppCapabilitiesSchema = z
  .object({
    strengths: z.array(z.string()).optional().describe("优势列表"),
    bestFor: z.array(z.string()).optional().describe("最佳用途"),
    limitations: z.array(z.string()).optional().describe("限制说明"),
    speed: SpeedSchema,
    quality: QualitySchema,
  })
  .describe("APP 能力描述");

/**
 * 输入参数约束
 */
export const InputConstraintsSchema = z
  .object({
    min: z.number().optional().describe("最小值"),
    max: z.number().optional().describe("最大值"),
    step: z.number().optional().describe("步进值"),
    multiline: z.boolean().optional().describe("是否多行输入"),
    dynamicPrompts: z.boolean().optional().describe("是否支持动态提示词"),
    image_upload: z.boolean().optional().describe("是否支持图片上传"),
    control_after_generate: z.boolean().optional().describe("生成后是否可控"),
  })
  .describe("输入参数约束");

/**
 * 处理提示
 * - direct: 可直接通过 API 设置
 * - upload: 需要先上传文件
 * - manual: 需要 GUI 手动操作
 */
export const ProcessHintSchema = z.enum(["direct", "upload", "manual"]).describe("参数处理方式");

/**
 * 输入参数配置
 */
export const InputParamSchema = z.object({
  nodeId: z.string().describe("节点 ID"),
  nodeName: z.string().optional().describe("节点名称"),
  fieldName: z.string().describe("字段名称"),
  type: z.string().describe("字段类型（STRING/INT/FLOAT/IMAGE 等）"),
  description: z.string().optional().describe("参数描述（中文）"),
  descriptionEn: z.string().optional().describe("参数描述（英文）"),
  default: z.union([z.string(), z.number()]).optional().describe("默认值"),
  options: z.array(z.string()).optional().describe("LIST 类型的选项值"),
  processHint: ProcessHintSchema.optional().describe("处理提示"),
  constraints: InputConstraintsSchema.optional().describe("参数约束"),
});

/**
 * 效果预览图
 */
export const CoverInfoSchema = z.object({
  id: z.string().describe("预览图 ID"),
  url: z.string().describe("预览图 URL"),
  thumbnailUri: z.string().describe("缩略图 URI"),
  imageWidth: z.string().optional().describe("图片宽度"),
  imageHeight: z.string().optional().describe("图片高度"),
});

// ============================================
// 用户 APP Schema（最小配置）
// ============================================

/**
 * 用户添加 APP 的最小配置 Schema
 *
 * 只需 3 个必填字段即可添加 APP。
 * 其他字段从 API 自动获取。
 */
export const UserAppConfigSchema = z.object({
  appId: z.string().regex(/^\d+$/, "APP ID 必须为数字字符串").describe("RunningHub APP 唯一标识"),

  alias: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/, "别名必须为 3-40 位小写字母、数字或连字符")
    .describe("APP 调用别名"),

  category: CategorySchema.describe("APP 类别"),
});

// ============================================
// 服务端 APP Schema（完整配置）
// ============================================

/**
 * 服务端公共 APP 的完整配置 Schema
 *
 * 包含所有必填和推荐字段。
 */
export const ServerAppConfigSchema = z.object({
  // === 必填字段 ===
  appId: z.string().regex(/^\d+$/, "APP ID 必须为数字字符串").describe("RunningHub APP 唯一标识"),

  alias: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/, "别名必须为 3-40 位小写字母、数字或连字符")
    .describe("APP 调用别名"),

  category: CategorySchema.describe("APP 类别"),

  modelName: z.string().min(1).describe("底层模型名称"),

  usageType: z.string().min(1).describe("用途类型"),

  description: z.string().min(1).max(100).describe("功能描述（50字以内推荐）"),

  mcpLevel: McpLevelSchema.describe("MCP 兼容性等级"),

  // === 推荐字段 ===
  modelFamily: z.string().optional().describe("模型系列（用于自动导入规则）"),

  webappName: z.string().optional().describe("平台完整名称（从 API 获取）"),

  tags: z.array(z.string()).optional().describe("能力标签数组"),

  capabilities: AppCapabilitiesSchema.optional().describe("详细能力描述"),

  default: z.boolean().optional().describe("是否推荐为默认"),

  // === 自动填充字段 ===
  inputs: z.record(InputParamSchema).optional().describe("输入参数配置（从 API 填充）"),

  covers: z.array(CoverInfoSchema).optional().describe("效果预览图（从 API 获取）"),

  outputs: z.array(z.string()).optional().describe("输出类型列表"),

  constraints: z.record(z.any()).optional().describe("参数约束覆盖"),
});

// ============================================
// Apps 配置 Schema（分层结构）
// ============================================

/**
 * apps.json 的完整 Schema
 */
export const AppsConfigSchema = z.object({
  server: z
    .record(z.string(), ServerAppConfigSchema.passthrough())
    .describe("服务端预配置的 APP（以 _ 开头的键为元数据）"),

  user: z.record(z.string(), UserAppConfigSchema.passthrough()).describe("用户自定义的 APP 配置"),
});

// ============================================
// 类型导出
// ============================================

export type Category = z.infer<typeof CategorySchema>;
export type McpLevel = z.infer<typeof McpLevelSchema>;
export type Speed = z.infer<typeof SpeedSchema>;
export type Quality = z.infer<typeof QualitySchema>;
export type ProcessHint = z.infer<typeof ProcessHintSchema>;

export type AppCapabilities = z.infer<typeof AppCapabilitiesSchema>;
export type InputConstraints = z.infer<typeof InputConstraintsSchema>;
export type InputParam = z.infer<typeof InputParamSchema>;
export type CoverInfo = z.infer<typeof CoverInfoSchema>;

export type UserAppConfig = z.infer<typeof UserAppConfigSchema>;
export type ServerAppConfig = z.infer<typeof ServerAppConfigSchema>;
export type AppsConfig = z.infer<typeof AppsConfigSchema>;

// ============================================
// 验证函数
// ============================================

/**
 * 验证用户 APP 配置
 */
export function validateUserApp(config: unknown): {
  success: boolean;
  data?: UserAppConfig;
  errors?: string[];
} {
  const result = UserAppConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

/**
 * 验证服务端 APP 配置
 */
export function validateServerApp(config: unknown): {
  success: boolean;
  data?: ServerAppConfig;
  errors?: string[];
} {
  const result = ServerAppConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}
