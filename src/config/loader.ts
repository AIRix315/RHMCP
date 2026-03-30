/**
 * RHMCP 配置加载器
 * 支持新旧两种配置格式，包含向后兼容
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { config as dotenvConfig } from "dotenv";
import {
  RunningHubConfig,
  AppConfig,
  AppsConfig,
  StorageConfig,
  LogConfig,
  ModelRulesConfig,
  CloudStorageConfig,
} from "../types.js";
import { detectBaseUrl, isValidBaseUrl } from "./detector.js";

const DEFAULT_CONFIG_NAME = "rhmcp-config.json";
const LEGACY_CONFIG_NAME = "runninghub-mcp-config.json";
const ENV_API_KEY = "RUNNINGHUB_API_KEY";
const ENV_BASE_URL = "RUNNINGHUB_BASE_URL";
const ENV_CONFIG_PATH = "RHMCP_CONFIG";

const NEW_CONFIG_FILES = {
  service: "service.json",
  apps: "apps.json",
  env: ".env",
};

/**
 * 默认配置值
 */
const DEFAULTS = {
  baseUrl: "www.runninghub.cn" as const,
  maxConcurrent: 1,
  storage: {
    mode: "local" as const,
    path: "./output",
  },
  retry: {
    maxRetries: 3,
    maxWaitTime: 600,
    interval: 5,
  },
  logging: {
    level: "info" as const,
  },
  modelRules: {
    rules: {} as Record<string, never>,
    defaultLanguage: "zh",
  },
};

/**
 * JSON 配置对象类型
 */
type JsonConfig = Record<string, unknown>;

/**
 * 加载配置（异步版本，支持 baseUrl 自动检测）
 */
export async function loadConfig(configPath?: string): Promise<RunningHubConfig> {
  const explicitPath = configPath ?? process.env[ENV_CONFIG_PATH];

  // 1. 尝试加载旧格式（向后兼容）
  const legacyPath = findLegacyConfig(explicitPath);
  if (legacyPath) {
    console.error("[RHMCP] 检测到旧版配置格式，正在迁移...");
    return migrateAndLoad(legacyPath);
  }

  // 2. 加载新格式
  return loadNewConfig(explicitPath);
}

/**
 * 加载新格式配置（service.json + apps.json + .env）
 */
async function loadNewConfig(configDir?: string): Promise<RunningHubConfig> {
  const dir = configDir ?? process.cwd();

  // 加载 .env（如果存在）
  loadEnvFile(dir);

  // 加载 service.json
  const servicePath = join(dir, NEW_CONFIG_FILES.service);
  const serviceConfig = loadJsonFile(servicePath);

  // 加载 apps.json
  const appsPath = join(dir, NEW_CONFIG_FILES.apps);
  const appsConfig = loadJsonFile(appsPath) as AppsConfig | null;

  // 合并配置
  const baseUrl = process.env[ENV_BASE_URL] ?? getString(serviceConfig, "baseUrl", "auto");

  const config: RunningHubConfig = {
    apiKey: process.env[ENV_API_KEY] ?? getString(serviceConfig, "apiKey", ""),
    baseUrl: baseUrl,
    maxConcurrent: getNumber(serviceConfig, "maxConcurrent", DEFAULTS.maxConcurrent),
    storage: {
      mode: getStorageMode(serviceConfig, DEFAULTS.storage.mode),
      path: getString(getObject(serviceConfig, "storage"), "path", DEFAULTS.storage.path),
      cloudConfig: getCloudConfig(serviceConfig),
    },
    appsConfig: appsConfig ?? { server: {}, user: {} },
    apps: mergeApps(appsConfig),
    modelRules: {
      rules: getModelRules(serviceConfig),
      defaultLanguage: getString(
        getObject(serviceConfig, "modelRules"),
        "defaultLanguage",
        DEFAULTS.modelRules.defaultLanguage
      ),
    },
    retry: {
      maxRetries: getNumber(
        getObject(serviceConfig, "retry"),
        "maxRetries",
        DEFAULTS.retry.maxRetries
      ),
      maxWaitTime: getNumber(
        getObject(serviceConfig, "retry"),
        "maxWaitTime",
        DEFAULTS.retry.maxWaitTime
      ),
      interval: getNumber(getObject(serviceConfig, "retry"), "interval", DEFAULTS.retry.interval),
    },
    logging: {
      level: getLogLevel(serviceConfig, DEFAULTS.logging.level),
    },
  };

  // 处理 baseUrl 自动检测
  if (config.baseUrl === "auto") {
    if (!config.apiKey) {
      throw new Error(
        'baseUrl 设置为 "auto" 时，需要提供 apiKey（通过环境变量 RUNNINGHUB_API_KEY）'
      );
    }
    config.baseUrl = await detectBaseUrl(config.apiKey);
  }

  return config;
}

/**
 * 辅助函数：安全获取字符串值
 */
function getString(obj: JsonConfig | null, key: string, defaultValue: string): string {
  if (!obj) return defaultValue;
  const value = obj[key];
  return typeof value === "string" ? value : defaultValue;
}

/**
 * 辅助函数：安全获取数字值
 */
function getNumber(obj: JsonConfig | null, key: string, defaultValue: number): number {
  if (!obj) return defaultValue;
  const value = obj[key];
  return typeof value === "number" ? value : defaultValue;
}

/**
 * 辅助函数：安全获取对象
 */
function getObject(obj: JsonConfig | null, key: string): JsonConfig | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonConfig)
    : null;
}

/**
 * 辅助函数：获取存储模式
 */
function getStorageMode(
  obj: JsonConfig | null,
  defaultValue: StorageConfig["mode"]
): StorageConfig["mode"] {
  const storage = getObject(obj, "storage");
  if (!storage) return defaultValue;
  const mode = storage.mode;
  if (mode === "local" || mode === "network" || mode === "auto" || mode === "none") {
    return mode;
  }
  return defaultValue;
}

/**
 * 辅助函数：获取云存储配置
 */
function getCloudConfig(obj: JsonConfig | null): CloudStorageConfig | undefined {
  const storage = getObject(obj, "storage");
  if (!storage) return undefined;
  const cloudConfig = getObject(storage, "cloudConfig");
  if (!cloudConfig) return undefined;

  const provider = getString(cloudConfig, "provider", "");
  if (
    provider !== "baidu" &&
    provider !== "google" &&
    provider !== "aliyun" &&
    provider !== "aws"
  ) {
    return undefined;
  }

  return {
    provider,
    accessKey: getString(cloudConfig, "accessKey", ""),
    secretKey: getString(cloudConfig, "secretKey", ""),
    bucket: getString(cloudConfig, "bucket", ""),
    region: getString(cloudConfig, "region", ""),
  };
}

/**
 * 辅助函数：获取模型规则
 */
function getModelRules(obj: JsonConfig | null): ModelRulesConfig["rules"] {
  const modelRules = getObject(obj, "modelRules");
  if (!modelRules) return {};

  const rules = modelRules.rules;
  if (typeof rules === "object" && rules !== null && !Array.isArray(rules)) {
    return rules as ModelRulesConfig["rules"];
  }
  return {};
}

/**
 * 辅助函数：获取日志级别
 */
function getLogLevel(obj: JsonConfig | null, defaultValue: LogConfig["level"]): LogConfig["level"] {
  const logging = getObject(obj, "logging");
  if (!logging) return defaultValue;

  const level = logging.level;
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }
  return defaultValue;
}

/**
 * 加载 .env 文件
 */
function loadEnvFile(dir: string): void {
  const envPath = join(dir, NEW_CONFIG_FILES.env);
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath });
  }
}

/**
 * 合并 server 和 user APP 配置（user 优先）
 */
export function mergeApps(appsConfig: AppsConfig | undefined | null): Record<string, AppConfig> {
  if (!appsConfig) return {};

  const merged: Record<string, AppConfig> = {};

  // 先添加 server APPs
  if (appsConfig.server) {
    for (const [alias, app] of Object.entries(appsConfig.server)) {
      if (!alias.startsWith("_")) {
        merged[alias] = app;
      }
    }
  }

  // 再添加 user APPs（覆盖 server 同名）
  if (appsConfig.user) {
    for (const [alias, app] of Object.entries(appsConfig.user)) {
      if (!alias.startsWith("_")) {
        merged[alias] = app;
      }
    }
  }

  return merged;
}

/**
 * 查找旧格式配置文件
 */
function findLegacyConfig(configPath?: string): string | null {
  if (configPath && existsSync(configPath)) {
    return configPath;
  }

  const cwd = process.cwd();

  // 优先检查新格式
  const servicePath = join(cwd, NEW_CONFIG_FILES.service);
  if (existsSync(servicePath)) {
    return null; // 新格式存在，返回 null
  }

  // 检查旧格式
  const names = [DEFAULT_CONFIG_NAME, LEGACY_CONFIG_NAME];
  for (const name of names) {
    const path = join(cwd, name);
    if (existsSync(path)) return path;

    const configDirPath = join(cwd, "config", name);
    if (existsSync(configDirPath)) return configDirPath;
  }

  return null;
}

/**
 * 迁移并加载旧格式配置
 */
async function migrateAndLoad(oldPath: string): Promise<RunningHubConfig> {
  const rawConfig = loadJsonFile(oldPath);
  if (!rawConfig) {
    throw new Error(`无法加载配置文件: ${oldPath}`);
  }

  const apiKey = process.env[ENV_API_KEY] ?? getString(rawConfig, "apiKey", "");
  const baseUrl = process.env[ENV_BASE_URL] ?? getString(rawConfig, "baseUrl", "auto");

  const config: RunningHubConfig = {
    apiKey,
    baseUrl,
    maxConcurrent: getNumber(rawConfig, "maxConcurrent", DEFAULTS.maxConcurrent),
    storage: {
      mode: getStorageMode(rawConfig, DEFAULTS.storage.mode),
      path: getString(getObject(rawConfig, "storage"), "path", DEFAULTS.storage.path),
      cloudConfig: getCloudConfig(rawConfig),
    },
    apps: (rawConfig.apps as Record<string, AppConfig>) ?? {},
    appsConfig: {
      server: {},
      user: (rawConfig.apps as Record<string, AppConfig>) ?? {},
    },
    modelRules: {
      rules: getModelRules(rawConfig),
      defaultLanguage: getString(
        getObject(rawConfig, "modelRules"),
        "defaultLanguage",
        DEFAULTS.modelRules.defaultLanguage
      ),
    },
    retry: {
      maxRetries: getNumber(getObject(rawConfig, "retry"), "maxRetries", DEFAULTS.retry.maxRetries),
      maxWaitTime: getNumber(
        getObject(rawConfig, "retry"),
        "maxWaitTime",
        DEFAULTS.retry.maxWaitTime
      ),
      interval: getNumber(getObject(rawConfig, "retry"), "interval", DEFAULTS.retry.interval),
    },
    logging: {
      level: getLogLevel(rawConfig, DEFAULTS.logging.level),
    },
  };

  // 处理 baseUrl 自动检测
  if (config.baseUrl === "auto") {
    if (!config.apiKey) {
      console.error("[RHMCP] 警告: baseUrl 为 auto 但未提供 apiKey，使用默认域名");
      config.baseUrl = "www.runninghub.cn";
    } else {
      config.baseUrl = await detectBaseUrl(config.apiKey);
    }
  }

  console.error(`[RHMCP] 已从旧格式加载配置: ${oldPath}`);
  console.error("[RHMCP] 建议使用 migrate 命令迁移到新格式");

  return config;
}

/**
 * 移除配置中的注释字段（以 _ 开头）
 */
function removeComments(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(removeComments);

  const result: JsonConfig = {};
  for (const [key, value] of Object.entries(obj as JsonConfig)) {
    if (!key.startsWith("_")) {
      result[key] = removeComments(value);
    }
  }
  return result;
}

/**
 * 加载 JSON 文件（支持注释）
 */
function loadJsonFile(path: string): JsonConfig | null {
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, "utf-8");
    const parsed = removeComments(JSON.parse(content));
    return parsed as JsonConfig;
  } catch {
    return null;
  }
}

/**
 * 同步版本的配置加载（用于向后兼容，不支持自动检测）
 * @deprecated 请使用 loadConfig() 异步版本
 */
export function loadConfigSync(configPath?: string): RunningHubConfig {
  const legacyPath = findLegacyConfig(configPath);
  if (legacyPath) {
    const rawConfig = loadJsonFile(legacyPath);
    if (!rawConfig) {
      throw new Error(`无法加载配置文件: ${legacyPath}`);
    }

    return {
      apiKey: process.env[ENV_API_KEY] ?? getString(rawConfig, "apiKey", ""),
      baseUrl: process.env[ENV_BASE_URL] ?? getString(rawConfig, "baseUrl", DEFAULTS.baseUrl),
      maxConcurrent: getNumber(rawConfig, "maxConcurrent", DEFAULTS.maxConcurrent),
      storage: {
        mode: getStorageMode(rawConfig, DEFAULTS.storage.mode),
        path: getString(getObject(rawConfig, "storage"), "path", DEFAULTS.storage.path),
        cloudConfig: getCloudConfig(rawConfig),
      },
      apps: (rawConfig.apps as Record<string, AppConfig>) ?? {},
      appsConfig: {
        server: {},
        user: (rawConfig.apps as Record<string, AppConfig>) ?? {},
      },
      modelRules: {
        rules: getModelRules(rawConfig),
        defaultLanguage: getString(
          getObject(rawConfig, "modelRules"),
          "defaultLanguage",
          DEFAULTS.modelRules.defaultLanguage
        ),
      },
      retry: {
        maxRetries: getNumber(
          getObject(rawConfig, "retry"),
          "maxRetries",
          DEFAULTS.retry.maxRetries
        ),
        maxWaitTime: getNumber(
          getObject(rawConfig, "retry"),
          "maxWaitTime",
          DEFAULTS.retry.maxWaitTime
        ),
        interval: getNumber(getObject(rawConfig, "retry"), "interval", DEFAULTS.retry.interval),
      },
      logging: {
        level: getLogLevel(rawConfig, DEFAULTS.logging.level),
      },
    };
  }

  // 尝试同步加载新格式（不支持自动检测）
  const dir = configPath ?? process.cwd();
  loadEnvFile(dir);

  const serviceConfig = loadJsonFile(join(dir, NEW_CONFIG_FILES.service));
  const appsConfig = loadJsonFile(join(dir, NEW_CONFIG_FILES.apps)) as AppsConfig | null;

  return {
    apiKey: process.env[ENV_API_KEY] ?? getString(serviceConfig, "apiKey", ""),
    baseUrl: process.env[ENV_BASE_URL] ?? getString(serviceConfig, "baseUrl", DEFAULTS.baseUrl),
    maxConcurrent: getNumber(serviceConfig, "maxConcurrent", DEFAULTS.maxConcurrent),
    storage: {
      mode: getStorageMode(serviceConfig, DEFAULTS.storage.mode),
      path: getString(getObject(serviceConfig, "storage"), "path", DEFAULTS.storage.path),
    },
    apps: mergeApps(appsConfig),
    appsConfig: appsConfig ?? { server: {}, user: {} },
    modelRules: {
      rules: getModelRules(serviceConfig),
      defaultLanguage: getString(
        getObject(serviceConfig, "modelRules"),
        "defaultLanguage",
        DEFAULTS.modelRules.defaultLanguage
      ),
    },
    retry: {
      maxRetries: getNumber(
        getObject(serviceConfig, "retry"),
        "maxRetries",
        DEFAULTS.retry.maxRetries
      ),
      maxWaitTime: getNumber(
        getObject(serviceConfig, "retry"),
        "maxWaitTime",
        DEFAULTS.retry.maxWaitTime
      ),
      interval: getNumber(getObject(serviceConfig, "retry"), "interval", DEFAULTS.retry.interval),
    },
    logging: {
      level: getLogLevel(serviceConfig, DEFAULTS.logging.level),
    },
  };
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
    errors.push("apiKey 是必填项！请通过环境变量 RUNNINGHUB_API_KEY 或配置文件提供");
  } else if (config.apiKey === "YOUR_API_KEY_HERE") {
    errors.push("请将 apiKey 替换为您的真实 API Key");
  }

  // baseUrl 检查
  if (!config.baseUrl) {
    warnings.push("baseUrl 未设置，使用默认值: auto");
  } else if (config.baseUrl !== "auto" && !isValidBaseUrl(config.baseUrl)) {
    warnings.push(
      `baseUrl 可能不正确。请使用 auto（自动检测）、www.runninghub.cn（国内站）或 www.runninghub.ai（国际站）`
    );
  }

  // storage 检查
  if (!config.storage?.mode) {
    warnings.push("storage.mode 未设置，使用默认值: local");
  }

  if (config.storage?.mode === "network" && !config.storage?.cloudConfig) {
    errors.push("storage.mode 为 network 时，必须配置 cloudConfig");
  }

  // APP 配置检查（支持新旧格式）
  const apps = config.apps ?? mergeApps(config.appsConfig);
  if (Object.keys(apps).length === 0) {
    warnings.push("未配置任何 APP，请运行 rhmcp --update-apps 或在 apps.json 中添加配置");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
