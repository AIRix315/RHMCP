/**
 * Vitest 全局设置
 * 配置测试环境和全局 Mock
 */

import { beforeAll, afterAll, vi } from "vitest";

// 禁用 console.log 在测试中的输出（可选）
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});
