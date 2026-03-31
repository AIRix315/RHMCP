// RunningHub MCP - Core TypeScript Type Definitions
//
// 相关文档：
// - APP 发布规范：docs/APP_PUBLISHING_SPEC.md
// - 用户添加指南：docs/USER_ADD_APP_GUIDE.md
// - Schema 定义：src/schemas/app-config.ts

// ============================================
// Configuration Types
// ============================================

/**
 * BaseUrl 联合类型
 * - "auto": 自动检测账号归属
 * - "www.runninghub.cn": 国内站
 * - "www.runninghub.ai": 国际站
 */
export type BaseUrl = "auto" | "www.runninghub.cn" | "www.runninghub.ai";

/**
 * 分层 APP 配置
 *
 * - server: 从 GitHub 拉取的官方 APP 列表（由维护者精选）
 * - user: 用户自定义 APP，不会被更新覆盖
 *
 * @see docs/APP_PUBLISHING_SPEC.md 公共APP发布规范
 * @see docs/USER_ADD_APP_GUIDE.md 用户添加APP指南
 */
export interface AppsConfig {
  /** 服务端预配置的 APP，由平台维护（以 _ 开头的键为元数据） */
  server: Record<string, AppConfig>;
  /** 用户自定义的 APP 配置 */
  user: Record<string, AppConfig>;
  /** 更新时间戳（ISO 格式） */
  _updated?: string;
  /** 来源 URL */
  _source?: string;
}

export interface RunningHubConfig {
  apiKey: string;
  baseUrl: BaseUrl | string; // 支持 "auto" 或具体域名
  maxConcurrent: number;
  storage: StorageConfig;
  apps?: Record<string, AppConfig>; // 旧格式（扁平），保持向后兼容
  appsConfig?: AppsConfig; // 新格式（分层）
  modelRules: ModelRulesConfig;
  retry: RetryConfig;
  logging: LogConfig;
}

/**
 * 存储模式：
 * - local: 下载文件到本地目录，返回本地路径
 * - network: 上传到云存储，返回云端URL
 * - auto: Agent自动判断，需要继续处理返回URL，需交付用户则下载
 * - none: 仅返回RunningHub服务器原始URL，不做任何处理
 */
export type StorageMode = "local" | "network" | "auto" | "none";

export interface StorageConfig {
  mode: StorageMode;
  path: string;
  cloudConfig?: CloudStorageConfig;
}

export interface CloudStorageConfig {
  provider: "baidu" | "google" | "aliyun" | "aws";
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
}

/**
 * APP 效果预览图
 */
export interface CoverInfo {
  id: string;
  url: string;
  thumbnailUri: string;
  imageWidth?: string;
  imageHeight?: string;
}

/**
 * APP 能力描述
 *
 * 用于智能推荐和筛选，帮助 Agent 了解 APP 的优劣势。
 */
export interface AppCapabilities {
  /** 优势列表，如 ["中文理解强", "创意生成"] */
  strengths?: string[];
  /** 最佳用途，如 ["创意插图", "概念设计"] */
  bestFor?: string[];
  /** 限制说明，如 ["不支持超高清"] */
  limitations?: string[];
  /** 生成速度 */
  speed?: "fast" | "medium" | "slow";
  /** 输出质量 */
  quality?: "low" | "medium" | "high" | "ultra";
}

/**
 * 输入参数约束（从 fieldData 解析）
 */
export interface InputConstraints {
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
  dynamicPrompts?: boolean;
  image_upload?: boolean;
  control_after_generate?: boolean;
}

/**
 * APP 配置
 *
 * 字段分为必填、推荐、自动填充三类：
 * - 必填：appId, alias, category（用户添加最小配置）
 * - 推荐：modelName, usageType, description, mcpLevel, tags, capabilities
 * - 自动：inputs, covers, webappName（从 API 获取）
 *
 * @see docs/APP_PUBLISHING_SPEC.md 字段标准详细说明
 */
export interface AppConfig {
  // === 必填字段 ===
  /** RunningHub APP 唯一标识（数字字符串） */
  appId: string;
  /** APP 调用别名（小写字母+数字+连字符，3-40字符） */
  alias: string;
  /** APP 类别 */
  category: "image" | "audio" | "video";

  // === 推荐字段 ===
  /** 底层模型名称，如 "Qwen-001"、"SDXL"、"Flux" */
  modelName?: string;
  /** 用途类型，如 "文生图"、"提示词改图" */
  usageType?: string;
  /** 功能描述（建议30-50字，包含适用场景） */
  description?: string;
  /** MCP 兼容性等级，用于判断 Agent 是否可自动调用 */
  mcpLevel?: "full" | "partial" | "manual";
  /** 能力标签数组，用于筛选和语义匹配 */
  tags?: string[];
  /** 详细能力描述 */
  capabilities?: AppCapabilities;

  // === 自动填充字段 ===
  /** 平台完整名称（从 API 获取） */
  webappName?: string;
  /** 效果预览图（从 API 获取） */
  covers?: CoverInfo[];
  /** 输入参数配置（从 API 自动填充） */
  inputs: Record<string, InputParam>;

  // === 可选字段 ===
  /** 模型系列（用于自动导入规则） */
  modelFamily?: string;
  /** 输出类型列表 */
  outputs?: string[];
  /** 参数约束覆盖 */
  constraints?: Record<string, Constraint>;
  /** 是否推荐为默认 */
  default?: boolean;
}

/**
 * 输入参数配置
 *
 * processHint 用于提示 Agent 如何处理参数：
 * - direct: 可直接通过 API 设置（STRING/INT/FLOAT/LIST/SWITCH）
 * - upload: 需要先上传文件（IMAGE/AUDIO/VIDEO）
 * - manual: 需要 GUI 手动操作（LAYER/MASK/TRAJECTORY）
 */
export interface InputParam {
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName?: string;
  /** 字段名称 */
  fieldName: string;
  /** 字段类型（STRING/INT/FLOAT/IMAGE/AUDIO/VIDEO/LIST/SWITCH 等） */
  type: string;
  /** 参数描述（中文） */
  description?: string;
  /** 参数描述（英文） */
  descriptionEn?: string;
  /** 默认值 */
  default?: string | number;
  /** LIST 类型的选项值 */
  options?: string[];
  /** 参数处理方式提示 */
  processHint?: "direct" | "upload" | "manual";
  /** 参数约束 */
  constraints?: InputConstraints;
}

export interface Constraint {
  min?: number;
  max?: number;
  step?: number;
  format?: "natural" | "tags" | "hybrid" | "structured";
  languages?: string[];
  maxLength?: number;
}

export interface RetryConfig {
  maxRetries: number;
  maxWaitTime: number;
  interval: number;
  appOverrides?: Record<string, Partial<RetryConfig>>;
}

export interface LogConfig {
  level: "debug" | "info" | "warn" | "error";
  file?: string;
  maxSize?: number;
  maxFiles?: number;
}

export interface ModelRulesConfig {
  source?: "github" | "local";
  repo?: string;
  branch?: string;
  rules: Record<string, ModelRule>;
  defaultLanguage: string;
}

// ============================================
// API Response Types
// ============================================

export interface NodeInfo {
  nodeId: string;
  nodeName: string;
  fieldName: string;
  fieldValue: string;
  fieldType: string;
  fieldData?: string;
  description?: string;
  descriptionEn?: string;
}

export interface TaskResult {
  taskId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  fileUrl?: string;
  fileType?: string;
  error?: string;
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data?: T;
}

// 扩展的 API 响应类型，包含 APP 详情
export interface AppInfoResponse {
  nodeInfoList: NodeInfo[];
  webappName?: string;
  description?: string;
  covers?: CoverInfo[];
}

export interface TaskSubmitResponse {
  taskId: string;
  status: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  progress?: number;
  message?: string;
  result?: TaskResult;
}

// ============================================
// Model Rules Types
// ============================================

export interface ModelRule {
  name: string;
  description: string;
  category: "image" | "audio" | "video";
  constraints: Record<string, Constraint>;
  promptSpec?: PromptSpec;
}

export interface PromptSpec {
  format: "natural" | "tags" | "hybrid" | "structured";
  languages: string[];
  preferredLanguage: string;
  maxLength?: number;
  examples?: {
    good: string[];
    bad?: string[];
  };
}

// ============================================
// Utility Types
// ============================================

export type Category = "image" | "audio" | "video";

export type FieldType =
  | "STRING"
  | "INT"
  | "FLOAT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "LIST"
  | "SWITCH";

export type TaskStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export type StorageType = "local" | "baidu" | "google";

export type PromptFormat = "natural" | "tags" | "hybrid" | "structured";

export type LogLevel = "debug" | "info" | "warn" | "error";

// ============================================
// Internal Types
// ============================================

export interface ExecutionContext {
  taskId: string;
  appId: string;
  params: Record<string, unknown>;
  startTime: number;
  retryCount: number;
}

export interface ParamValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ParamValidationError[];
}
