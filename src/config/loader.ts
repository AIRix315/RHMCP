import { RunningHubConfig, StorageConfig } from "../types.js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const DEFAULT_CONFIG_NAME = "rhmcp-config.json";
const LEGACY_CONFIG_NAME = "runninghub-mcp-config.json";
const ENV_API_KEY = "RUNNINGHUB_API_KEY";

/**
 * 默认配置值
 */
const DEFAULTS = {
  baseUrl: "www.runninghub.cn",
  maxConcurrent: 1,
  storage: {
    mode: "local",
    path: "./output",
  } as StorageConfig,
  retry: {
    maxRetries: 3,
    maxWaitTime: 600,
    interval: 5,
  },
  logging: {
    level: "info" as const,
  },
};

export function loadConfig(configPath?: string): RunningHubConfig {
  const path = configPath || findConfigFile();
  if (!path || !existsSync(path)) {
    throw new Error(
      "Configuration file not found. Please create rhmcp-config.json",
    );
  }

  const content = readFileSync(path, "utf-8");
  const rawConfig = JSON.parse(content);

  // 移除注释字段（以 _ 开头的字段）
  const config = removeComments(rawConfig);

  // 环境变量覆盖
  if (process.env[ENV_API_KEY]) {
    config.apiKey = process.env[ENV_API_KEY];
  }

  // 应用默认值
  return applyDefaults(config);
}

/**
 * 移除配置中的注释字段
 */
function removeComments(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith("_")) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = removeComments(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * 应用默认值
 */
function applyDefaults(config: any): RunningHubConfig {
  return {
    apiKey: config.apiKey || "",
    baseUrl: config.baseUrl || DEFAULTS.baseUrl,
    maxConcurrent: config.maxConcurrent || DEFAULTS.maxConcurrent,
    storage: {
      mode: config.storage?.mode || DEFAULTS.storage.mode,
      path: config.storage?.path || DEFAULTS.storage.path,
      cloudConfig: config.storage?.cloudConfig,
    },
    apps: config.apps || {},
    modelRules: config.modelRules || { rules: {}, defaultLanguage: "zh" },
    retry: {
      ...DEFAULTS.retry,
      ...config.retry,
    },
    logging: {
      ...DEFAULTS.logging,
      ...config.logging,
    },
  };
}

function findConfigFile(): string | null {
  const cwd = process.cwd();
  const paths = [
    join(cwd, DEFAULT_CONFIG_NAME),
    join(cwd, LEGACY_CONFIG_NAME), // 向后兼容旧配置名
    join(cwd, "config", DEFAULT_CONFIG_NAME),
    join(cwd, "config", LEGACY_CONFIG_NAME),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * 验证配置
 */
export function validateConfig(config: RunningHubConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必填项
  if (!config.apiKey) {
    errors.push("apiKey 是必填项！请从 RunningHub 个人中心获取 API Key");
  } else if (config.apiKey === "YOUR_API_KEY_HERE") {
    errors.push("请将 apiKey 替换为您的真实 API Key");
  }

  if (!config.baseUrl) {
    warnings.push("baseUrl 未设置，使用默认值: www.runninghub.cn");
  } else if (!config.baseUrl.includes("runninghub.")) {
    warnings.push(
      `baseUrl 可能不正确。请确认使用 www.runninghub.cn（国内站）或 www.runninghub.ai（国际站）`,
    );
  }

  if (!config.storage?.mode) {
    warnings.push("storage.mode 未设置，使用默认值: local");
  }

  if (config.storage?.mode === "network" && !config.storage?.cloudConfig) {
    errors.push("storage.mode 为 network 时，必须配置 cloudConfig");
  }

  if (Object.keys(config.apps || {}).length === 0) {
    warnings.push("未配置任何 APP，请在 apps 中添加 APP 配置");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
