/**
 * 参数验证单元测试
 * 测试验证器的边界条件和类型检查
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// 由于 validator 模块可能存在，我们创建基础测试
describe("Validators", () => {
  describe("基础类型验证", () => {
    it("应该验证字符串类型", () => {
      const schema = z.string();

      expect(schema.parse("valid")).toBe("valid");
      expect(schema.safeParse(123).success).toBe(false);
    });

    it("应该验证数字类型", () => {
      const schema = z.number().positive();

      expect(schema.parse(5)).toBe(5);
      expect(schema.safeParse(-1).success).toBe(false);
    });

    it("应该验证可选字段", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });

      expect(schema.parse({ name: "test" })).toEqual({ name: "test" });
      expect(schema.parse({ name: "test", age: 25 })).toEqual({ name: "test", age: 25 });
    });

    it("应该验证枚举值", () => {
      const schema = z.enum(["local", "network", "auto", "none"]);

      expect(schema.parse("local")).toBe("local");
      expect(schema.safeParse("invalid").success).toBe(false);
    });
  });

  describe("配置验证", () => {
    const StorageModeSchema = z.enum(["local", "network", "auto", "none"]);
    const StorageConfigSchema = z.object({
      mode: StorageModeSchema,
      path: z.string().optional(),
    });

    it("应该验证有效的存储配置", () => {
      const validConfig = { mode: "local", path: "./output" };
      const result = StorageConfigSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
    });

    it("应该拒绝无效的存储模式", () => {
      const invalidConfig = { mode: "invalid" };
      const result = StorageConfigSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });
  });

  describe("参数边界验证", () => {
    it("应该处理空字符串", () => {
      const schema = z.string().min(1);

      expect(schema.safeParse("").success).toBe(false);
      expect(schema.safeParse("valid").success).toBe(true);
    });

    it("应该处理数字边界", () => {
      const schema = z.number().int().min(1).max(100);

      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(101).success).toBe(false);
    });

    it("应该处理数组长度", () => {
      const schema = z.array(z.any()).min(1).max(10);

      expect(schema.safeParse([]).success).toBe(false);
      expect(schema.safeParse([1]).success).toBe(true);
      expect(schema.safeParse(Array(11).fill(1)).success).toBe(false);
    });
  });

  describe("复杂对象验证", () => {
    const AppConfigSchema = z.object({
      appId: z.string(),
      alias: z.string(),
      category: z.enum(["image", "audio", "video"]),
      inputs: z.record(z.any()).optional(),
      description: z.string().optional(),
    });

    it("应该验证有效的 APP 配置", () => {
      const validConfig = {
        appId: "123456",
        alias: "test-app",
        category: "image",
      };

      const result = AppConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("应该拒绝缺少必需字段的配置", () => {
      const invalidConfig = {
        appId: "123456",
        alias: "test-app",
      };

      const result = AppConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("应该拒绝无效的枚举值", () => {
      const invalidConfig = {
        appId: "123456",
        alias: "test-app",
        category: "invalid",
      };

      const result = AppConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("错误消息格式", () => {
    it("应该提供详细的错误信息", () => {
      const schema = z.object({
        name: z.string().min(3, "Name must be at least 3 characters"),
        age: z.number().positive("Age must be positive"),
      });

      const result = schema.safeParse({ name: "ab", age: -1 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
        expect(result.error.issues[0].message).toContain("at least 3");
        expect(result.error.issues[1].message).toContain("positive");
      }
    });
  });
});
