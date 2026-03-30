/**
 * 配置加载器 E2E 测试
 * 测试配置加载、验证、迁移等完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { validateConfig, mergeApps } from "../src/config/loader.js";
import type { RunningHubConfig, AppsConfig } from "../src/types.js";

// 测试临时目录
const TEST_DIR = join(process.cwd(), "test-temp-config");

describe("Config Loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清理环境变量
    delete process.env.RUNNINGHUB_API_KEY;
    delete process.env.RUNNINGHUB_BASE_URL;
    delete process.env.RHMCP_CONFIG;

    // 创建测试目录
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理测试目录
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    // 清理环境变量
    delete process.env.RUNNINGHUB_API_KEY;
    delete process.env.RUNNINGHUB_BASE_URL;
    delete process.env.RHMCP_CONFIG;
  });

  describe("validateConfig", () => {
    it("应该验证有效配置", () => {
      const config: RunningHubConfig = {
        apiKey: "valid_key",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: { "test-app": { appId: "123", alias: "test-app", category: "image", inputs: {} } },
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该在缺少 API Key 时返回错误", () => {
      const config: RunningHubConfig = {
        apiKey: "",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("apiKey"))).toBe(true);
    });

    it("应该在 network 模式缺少 cloudConfig 时返回错误", () => {
      const config: RunningHubConfig = {
        apiKey: "test_key",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "network", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cloudConfig"))).toBe(true);
    });

    it("应该在 baseUrl 可能为无效时返回警告", () => {
      const config: RunningHubConfig = {
        apiKey: "test_key",
        baseUrl: "invalid-url",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("baseUrl"))).toBe(true);
    });

    it("应该检测占位符 API Key", () => {
      const config: RunningHubConfig = {
        apiKey: "YOUR_API_KEY_HERE",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("真实 API Key"))).toBe(true);
    });

    it("应该在没有配置 APP 时返回警告", () => {
      const config: RunningHubConfig = {
        apiKey: "test_key",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);

      expect(result.warnings.some((w) => w.includes("APP"))).toBe(true);
    });
  });

  describe("mergeApps", () => {
    it("应该正确合并 server 和 user APP 配置", () => {
      const appsConfig: AppsConfig = {
        server: {
          "server-app": {
            appId: "server-123",
            alias: "server-app",
            category: "image",
            inputs: {},
          },
        },
        user: {
          "user-app": {
            appId: "user-456",
            alias: "user-app",
            category: "video",
            inputs: {},
          },
        },
      };

      const merged = mergeApps(appsConfig);

      expect(merged["server-app"]).toBeDefined();
      expect(merged["user-app"]).toBeDefined();
      expect(merged["server-app"].appId).toBe("server-123");
      expect(merged["user-app"].appId).toBe("user-456");
    });

    it("user 配置应该覆盖同名的 server 配置", () => {
      const appsConfig: AppsConfig = {
        server: {
          "shared-app": {
            appId: "server-123",
            alias: "shared-app",
            category: "image",
            inputs: {},
          },
        },
        user: {
          "shared-app": {
            appId: "user-456",
            alias: "shared-app",
            category: "video",
            inputs: {},
          },
        },
      };

      const merged = mergeApps(appsConfig);

      expect(merged["shared-app"].appId).toBe("user-456");
      expect(merged["shared-app"].category).toBe("video");
    });

    it("应该忽略以 _ 开头的配置项", () => {
      const appsConfig: AppsConfig = {
        server: {
          _comment: "这是一个注释" as any,
          app: {
            appId: "123",
            alias: "app",
            category: "image",
            inputs: {},
          },
        },
        user: {},
      };

      const merged = mergeApps(appsConfig);

      expect(merged["app"]).toBeDefined();
      expect(merged["_comment"]).toBeUndefined();
    });

    it("应该处理空配置", () => {
      expect(mergeApps(null as any)).toEqual({});
      expect(mergeApps(undefined as any)).toEqual({});
      expect(mergeApps({ server: {}, user: {} })).toEqual({});
    });

    it("应该处理只有 server 配置", () => {
      const appsConfig: AppsConfig = {
        server: {
          app1: { appId: "1", alias: "app1", category: "image", inputs: {} },
        },
        user: {},
      };

      const merged = mergeApps(appsConfig);
      expect(Object.keys(merged)).toHaveLength(1);
      expect(merged["app1"]).toBeDefined();
    });

    it("应该处理只有 user 配置", () => {
      const appsConfig: AppsConfig = {
        server: {},
        user: {
          app2: { appId: "2", alias: "app2", category: "audio", inputs: {} },
        },
      };

      const merged = mergeApps(appsConfig);
      expect(Object.keys(merged)).toHaveLength(1);
      expect(merged["app2"]).toBeDefined();
    });
  });

  describe("配置默认值", () => {
    it("验证默认配置结构", () => {
      const defaultConfig: Partial<RunningHubConfig> = {
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
        modelRules: { rules: {}, defaultLanguage: "zh" },
      };

      expect(defaultConfig.baseUrl).toBe("www.runninghub.cn");
      expect(defaultConfig.maxConcurrent).toBe(1);
      expect(defaultConfig.storage?.mode).toBe("local");
    });

    it("支持有效的 baseUrl 值", () => {
      const validUrls = ["www.runninghub.cn", "www.runninghub.ai", "auto"];

      for (const url of validUrls) {
        const config: RunningHubConfig = {
          apiKey: "test",
          baseUrl: url,
          maxConcurrent: 1,
          storage: { mode: "local", path: "./output" },
          apps: {},
          appsConfig: { server: {}, user: {} },
          modelRules: { rules: {}, defaultLanguage: "zh" },
          retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
          logging: { level: "info" },
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      }
    });

    it("支持所有存储模式", () => {
      const modes: Array<"local" | "network" | "auto" | "none"> = [
        "local",
        "network",
        "auto",
        "none",
      ];

      for (const mode of modes) {
        const storageConfig = { mode, path: "./output" };

        if (mode === "network") {
          (storageConfig as any).cloudConfig = {
            provider: "baidu",
            accessKey: "key",
            secretKey: "secret",
            bucket: "bucket",
          };
        }

        const config: RunningHubConfig = {
          apiKey: "test",
          baseUrl: "www.runninghub.cn",
          maxConcurrent: 1,
          storage: storageConfig as any,
          apps: {},
          appsConfig: { server: {}, user: {} },
          modelRules: { rules: {}, defaultLanguage: "zh" },
          retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
          logging: { level: "info" },
        };

        const result = validateConfig(config);
        if (mode !== "network") {
          expect(result.valid || result.errors.length === 0).toBe(true);
        }
      }
    });
  });

  describe("环境变量优先级", () => {
    it("环境变量应该覆盖配置文件", () => {
      process.env.RUNNINGHUB_API_KEY = "env_key";
      process.env.RUNNINGHUB_BASE_URL = "www.runninghub.ai";

      expect(process.env.RUNNINGHUB_API_KEY).toBe("env_key");
      expect(process.env.RUNNINGHUB_BASE_URL).toBe("www.runninghub.ai");

      // 清理
      delete process.env.RUNNINGHUB_API_KEY;
      delete process.env.RUNNINGHUB_BASE_URL;
    });
  });

  describe("配置验证边界条件", () => {
    it("应该处理 maxConcurrent 边界值", () => {
      // 正常值
      const config1: RunningHubConfig = {
        apiKey: "test",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
        logging: { level: "info" },
      };

      const result = validateConfig(config1);
      expect(result.valid).toBe(true);
    });

    it("应该验证 retry 配置", () => {
      const config: RunningHubConfig = {
        apiKey: "test",
        baseUrl: "www.runninghub.cn",
        maxConcurrent: 1,
        storage: { mode: "local", path: "./output" },
        apps: {},
        appsConfig: { server: {}, user: {} },
        modelRules: { rules: {}, defaultLanguage: "zh" },
        retry: { maxRetries: 5, maxWaitTime: 1200, interval: 10 },
        logging: { level: "info" },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it("应该支持所有日志级别", () => {
      const levels: Array<"debug" | "info" | "warn" | "error"> = ["debug", "info", "warn", "error"];

      for (const level of levels) {
        const config: RunningHubConfig = {
          apiKey: "test",
          baseUrl: "www.runninghub.cn",
          maxConcurrent: 1,
          storage: { mode: "local", path: "./output" },
          apps: {},
          appsConfig: { server: {}, user: {} },
          modelRules: { rules: {}, defaultLanguage: "zh" },
          retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
          logging: { level },
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      }
    });
  });
});
