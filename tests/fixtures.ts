/**
 * 测试数据 Fixtures
 * 提供通用的 Mock 数据
 */

import type {
  RunningHubConfig,
  AppConfig,
  AppsConfig,
  AppInfoResponse,
  TaskResult,
  ApiResponse,
  NodeInfo,
  StorageConfig,
} from "../../src/types.js";

/**
 * Mock API Key
 */
export const MOCK_API_KEY = "sk_test_1234567890abcdef";
export const MOCK_BASE_URL = "www.runninghub.cn";
export const MOCK_APP_ID = "2037760725296357377";

/**
 * 默认配置
 */
export const defaultStorageConfig: StorageConfig = {
  mode: "local",
  path: "./output",
};

export const defaultRetryConfig = {
  maxRetries: 3,
  maxWaitTime: 600,
  interval: 5,
};

export const defaultLogConfig = {
  level: "info" as const,
};

/**
 * Mock 完整配置
 */
export function createMockConfig(overrides: Partial<RunningHubConfig> = {}): RunningHubConfig {
  return {
    apiKey: MOCK_API_KEY,
    baseUrl: MOCK_BASE_URL,
    maxConcurrent: 1,
    storage: defaultStorageConfig,
    appsConfig: { server: {}, user: {} },
    apps: {},
    modelRules: { rules: {}, defaultLanguage: "zh" },
    retry: defaultRetryConfig,
    logging: defaultLogConfig,
    ...overrides,
  };
}

/**
 * Mock APP 配置
 */
export function createMockAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    appId: MOCK_APP_ID,
    alias: "test-app",
    category: "image",
    inputs: {
      text: {
        nodeId: "node_001",
        fieldName: "text",
        type: "STRING",
        required: true,
        description: "提示词",
      },
    },
    ...overrides,
  };
}

/**
 * Mock APP 配置列表
 */
export function createMockAppsConfig(): AppsConfig {
  return {
    server: {
      "qwen-text-to-image": createMockAppConfig({
        appId: "2037760725296357377",
        alias: "qwen-text-to-image",
        description: "Qwen文生图",
      }),
    },
    user: {
      "test-app": createMockAppConfig({
        appId: "2037822548796252162",
        alias: "test-app",
      }),
    },
  };
}

/**
 * Mock NodeInfo 列表
 */
export function createMockNodeInfoList(): NodeInfo[] {
  return [
    {
      nodeId: "node_001",
      nodeName: "text_input",
      fieldName: "text",
      fieldType: "STRING",
      fieldValue: "test prompt",
    },
  ];
}

/**
 * Mock APP 信息响应
 */
export function createMockAppInfoResponse(): ApiResponse<AppInfoResponse> {
  return {
    code: 0,
    msg: "success",
    data: {
      nodeInfoList: createMockNodeInfoList(),
      webappName: "Qwen 文生图",
      description: "根据文字描述生成图片",
    },
  };
}

/**
 * Mock 任务提交响应
 */
export function createMockTaskSubmitResponse(
  taskId: string = "task_001"
): ApiResponse<{ taskId: string }> {
  return {
    code: 0,
    msg: "success",
    data: { taskId },
  };
}

/**
 * Mock 任务状态响应（运行中）
 */
export function createMockTaskRunningResponse(taskId: string): ApiResponse<TaskResult[]> {
  return {
    code: 804,
    msg: "RUNNING",
  };
}

/**
 * Mock 任务状态响应（排队中）
 */
export function createMockTaskQueuedResponse(taskId: string): ApiResponse<TaskResult[]> {
  return {
    code: 813,
    msg: "QUEUED",
  };
}

/**
 * Mock 任务状态响应（成功）
 */
export function createMockTaskSuccessResponse(
  taskId: string,
  fileUrl: string = "https://example.com/output.png"
): ApiResponse<TaskResult[]> {
  return {
    code: 0,
    msg: "success",
    data: [
      {
        taskId,
        status: "SUCCESS",
        fileUrl,
        fileType: "image/png",
      },
    ],
  };
}

/**
 * Mock 任务状态响应（失败）
 */
export function createMockTaskFailedResponse(
  taskId: string,
  errorMsg: string = "Generation failed"
): ApiResponse<TaskResult[]> {
  return {
    code: 805,
    msg: "FAILED",
    data: [
      {
        taskId,
        status: "FAILED",
        error: errorMsg,
      },
    ],
  };
}

/**
 * Mock 服务配置 JSON
 */
export const mockServiceConfig = {
  baseUrl: "auto",
  maxConcurrent: 1,
  storage: { mode: "local", path: "./output" },
  retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
  logging: { level: "info" },
  modelRules: { rules: {}, defaultLanguage: "zh" },
};

/**
 * Mock apps.json 内容
 */
export const mockAppsConfigJson = {
  server: {
    "qwen-text-to-image": {
      appId: "2037760725296357377",
      alias: "qwen-text-to-image",
      category: "image",
      description: "Qwen文生图",
      inputs: {
        text: {
          nodeId: "node_001",
          fieldName: "text",
          type: "STRING",
          required: true,
        },
      },
    },
  },
  user: {},
};

/**
 * 生成临时测试文件路径
 */
export function getTestFilePath(filename: string): string {
  return `./test-output/${filename}`;
}
