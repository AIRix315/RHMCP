// RunningHub MCP - Core TypeScript Type Definitions

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
 * - server: 从 GitHub 拉取的官方 APP 列表
 * - user: 用户自定义 APP，不会被更新覆盖
 */
export interface AppsConfig {
  server: Record<string, AppConfig>;
  user: Record<string, AppConfig>;
  _updated?: string; // 更新时间戳
  _source?: string; // 来源 URL
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

export interface AppConfig {
  appId: string;
  alias: string;
  modelFamily?: string;
  category: "image" | "audio" | "video";
  description?: string;
  inputs: Record<string, InputParam>;
  outputs?: string[];
  constraints?: Record<string, Constraint>;
}

export interface InputParam {
  nodeId: string;
  fieldName: string;
  type: "STRING" | "INT" | "FLOAT" | "IMAGE" | "AUDIO" | "VIDEO" | "LIST" | "SWITCH";
  required: boolean;
  description?: string;
  default?: string | number;
  options?: string[];
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
  covers?: string[];
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
