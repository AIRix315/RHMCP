/**
 * 存储模块集成测试
 * 测试文件下载、存储模式处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  downloadToFile,
  processOutput,
  ensureOutputDir,
  getDefaultStorageConfig,
  validateStorageConfig,
} from "../src/utils/storage.js";
import type { StorageConfig } from "../src/types.js";

const TEST_OUTPUT_DIR = join(process.cwd(), "test-output-storage");

describe("Storage Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 创建测试输出目录
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理测试输出目录
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe("ensureOutputDir", () => {
    it("应该创建不存在的目录", () => {
      const testDir = join(TEST_OUTPUT_DIR, "new-dir");
      ensureOutputDir(testDir);
      expect(existsSync(testDir)).toBe(true);
    });

    it("应该处理已存在的目录", () => {
      ensureOutputDir(TEST_OUTPUT_DIR);
      expect(existsSync(TEST_OUTPUT_DIR)).toBe(true);
    });

    it("应该创建嵌套目录结构", () => {
      const nestedDir = join(TEST_OUTPUT_DIR, "level1", "level2", "level3");
      ensureOutputDir(nestedDir);
      expect(existsSync(nestedDir)).toBe(true);
    });
  });

  describe("downloadToFile", () => {
    it("应该成功下载文件到本地", async () => {
      const mockContent = "test file content";
      const url = "https://example.com/test.png";
      const localPath = join(TEST_OUTPUT_DIR, "downloaded.png");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode(mockContent).buffer,
        })
      );

      const result = await downloadToFile(url, localPath);

      expect(result).toBe(localPath);
      expect(existsSync(localPath)).toBe(true);
      expect(readFileSync(localPath, "utf-8")).toBe(mockContent);
    });

    it("应该处理下载失败", async () => {
      const url = "https://example.com/notfound.png";
      const localPath = join(TEST_OUTPUT_DIR, "failed.png");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
      );

      await expect(downloadToFile(url, localPath)).rejects.toThrow("下载失败");
    });

    it("应该创建父目录如果不存在", async () => {
      const mockContent = "nested content";
      const url = "https://example.com/nested.png";
      const localPath = join(TEST_OUTPUT_DIR, "deep", "nested", "file.png");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode(mockContent).buffer,
        })
      );

      const result = await downloadToFile(url, localPath);

      expect(existsSync(localPath)).toBe(true);
    });
  });

  describe("processOutput", () => {
    it("mode=none: 应该仅返回原始 URL", async () => {
      const fileUrl = "https://example.com/output.png";
      const config: StorageConfig = { mode: "none", path: TEST_OUTPUT_DIR };

      const result = await processOutput(fileUrl, "file1", config);

      expect(result.originalUrl).toBe(fileUrl);
      expect(result.mode).toBe("none");
      expect(result.localPath).toBeUndefined();
    });

    it("mode=local: 应该下载文件到本地", async () => {
      const fileUrl = "https://example.com/local.png";
      const config: StorageConfig = { mode: "local", path: TEST_OUTPUT_DIR };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
        })
      );

      const result = await processOutput(fileUrl, "file2", config);

      expect(result.originalUrl).toBe(fileUrl);
      expect(result.mode).toBe("local");
      expect(result.localPath).toBeDefined();
      expect(existsSync(result.localPath!)).toBe(true);
    });

    it("mode=network: 应该回落到 local（云存储未实现）", async () => {
      const fileUrl = "https://example.com/network.png";
      const config: StorageConfig = {
        mode: "network",
        path: TEST_OUTPUT_DIR,
        cloudConfig: undefined,
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new Uint8Array([5, 6, 7, 8]).buffer,
        })
      );

      const result = await processOutput(fileUrl, "file3", config);

      // 当前实现会 fallback 到 local
      expect(result.mode).toBe("local");
      expect(result.localPath).toBeDefined();
    });

    it("mode=auto: 应该下载文件", async () => {
      const fileUrl = "https://example.com/auto.png";
      const config: StorageConfig = { mode: "auto", path: TEST_OUTPUT_DIR };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new Uint8Array([9, 10, 11, 12]).buffer,
        })
      );

      const result = await processOutput(fileUrl, "file4", config);

      expect(result.localPath).toBeDefined();
      expect(existsSync(result.localPath!)).toBe(true);
    });

    it("应该使用 taskId 生成文件名", async () => {
      const fileUrl = "https://example.com/task-output.png";
      const taskId = "task_12345";
      const config: StorageConfig = { mode: "local", path: TEST_OUTPUT_DIR };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new Uint8Array([1]).buffer,
        })
      );

      const result = await processOutput(fileUrl, "1", config, taskId);

      expect(result.localPath).toContain(taskId);
    });

    it("应该从 URL 提取文件扩展名", async () => {
      const fileUrl = "https://example.com/image.png";
      const config: StorageConfig = { mode: "local", path: TEST_OUTPUT_DIR };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new Uint8Array([1]).buffer,
        })
      );

      const result = await processOutput(fileUrl, "file", config);

      expect(result.localPath).toMatch(/\.png$/);
    });
  });

  describe("getDefaultStorageConfig", () => {
    it("应该返回默认存储配置", () => {
      const config = getDefaultStorageConfig();

      expect(config.mode).toBe("local");
      expect(config.path).toBe("./output");
    });
  });

  describe("validateStorageConfig", () => {
    it("应该验证有效配置", () => {
      const config: StorageConfig = {
        mode: "local",
        path: "./output",
      };

      const result = validateStorageConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该在 mode 未设置时返回警告", () => {
      const config = {} as StorageConfig;

      const result = validateStorageConfig(config);

      expect(result.warnings.some((w) => w.includes("storage.mode"))).toBe(true);
    });

    it("应该在 mode=network 时验证 cloudConfig", () => {
      const config: StorageConfig = {
        mode: "network",
        path: "./output",
      };

      const result = validateStorageConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cloudConfig"))).toBe(true);
    });

    it("应该在 mode=network + provider 有效时通过", () => {
      const config: StorageConfig = {
        mode: "network",
        path: "./output",
        cloudConfig: {
          provider: "baidu",
          accessKey: "key",
          secretKey: "secret",
          bucket: "bucket",
        },
      };

      const result = validateStorageConfig(config);

      expect(result.valid).toBe(true);
    });

    it("应该接受所有有效的 provider", () => {
      const providers = ["baidu", "google", "aliyun", "aws"] as const;

      for (const provider of providers) {
        const config: StorageConfig = {
          mode: "network",
          path: "./output",
          cloudConfig: {
            provider,
            accessKey: "key",
            secretKey: "secret",
            bucket: "bucket",
          },
        };

        const result = validateStorageConfig(config);
        expect(result.valid).toBe(true);
      }
    });
  });
});
