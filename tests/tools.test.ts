/**
 * MCP 工具执行 E2E 测试
 * 测试所有工具的完整执行流程
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RunningHubClient } from "../src/api/client.js";
import type { RunningHubConfig } from "../src/types.js";
import {
  MOCK_API_KEY,
  MOCK_BASE_URL,
  MOCK_APP_ID,
  createMockConfig,
  createMockAppConfig,
} from "./fixtures.js";

// Mock client factory
function createTestClient(): RunningHubClient {
  return new RunningHubClient(createMockConfig());
}

describe("Tools E2E Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("rh_get_app_info", () => {
    it("应该成功获取 APP 信息", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          nodeInfoList: [
            { nodeId: "1", nodeName: "input", fieldName: "text", fieldType: "STRING" },
          ],
          webappName: "Test App",
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createTestClient();
      const result = await client.getAppInfo(MOCK_APP_ID);

      expect(result.code).toBe(0);
      expect(result.data?.webappName).toBe("Test App");
      expect(result.data?.nodeInfoList).toHaveLength(1);
    });

    it("应该处理无效的 APP ID", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 404, msg: "App not found" }),
      });

      const client = createTestClient();
      const result = await client.getAppInfo("invalid-id");

      expect(result.code).toBe(404);
      expect(result.msg).toBe("App not found");
    });
  });

  describe("rh_execute_app", () => {
    it("应该成功执行同步任务", async () => {
      const taskId = "task_001";

      // Mock getAppInfo
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            nodeInfoList: [
              { nodeId: "1", nodeName: "input", fieldName: "text", fieldType: "STRING" },
            ],
          },
        }),
      });

      // Mock submitTask
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: { taskId } }),
      });

      // Mock queryTask (success)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: [{ taskId, status: "SUCCESS", fileUrl: "https://example.com/result.png" }],
        }),
      });

      const client = createTestClient();

      // 获取 APP 信息
      const appInfo = await client.getAppInfo(MOCK_APP_ID);
      expect(appInfo.code).toBe(0);

      // 提交任务
      const nodeInfoList =
        appInfo.data?.nodeInfoList?.map((n) => ({
          ...n,
          fieldValue: "test prompt",
        })) || [];

      const submitResult = await client.submitTask(MOCK_APP_ID, nodeInfoList as any);
      expect(submitResult.code).toBe(0);

      // 查询结果
      const queryResult = await client.queryTask(taskId);
      expect(queryResult.code).toBe(0);
      expect(queryResult.data?.[0]?.status).toBe("SUCCESS");
    });

    it("应该处理任务失败", async () => {
      const taskId = "task_failed";

      // Mock submitTask success
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: { taskId } }),
      });

      // Mock queryTask failure
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 805,
          msg: "FAILED",
          data: [{ taskId, status: "FAILED", error: "Generation failed" }],
        }),
      });

      const client = createTestClient();

      // 提交任务
      const nodeInfoList = [
        {
          nodeId: "1",
          nodeName: "input",
          fieldName: "text",
          fieldType: "STRING",
          fieldValue: "test",
        },
      ];
      await client.submitTask(MOCK_APP_ID, nodeInfoList);

      // 查询结果
      const queryResult = await client.queryTask(taskId);
      expect(queryResult.code).toBe(805);
      expect(queryResult.data?.[0]?.status).toBe("FAILED");
    });

    it("应该处理任务排队/运行状态", async () => {
      const taskId = "task_running";

      // Mock submitTask
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: { taskId } }),
      });

      // Mock queryTask - running
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 804, msg: "RUNNING" }),
      });

      // Mock queryTask - success
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: [{ taskId, status: "SUCCESS", fileUrl: "https://example.com/result.png" }],
        }),
      });

      const client = createTestClient();

      const nodeInfoList = [
        {
          nodeId: "1",
          nodeName: "input",
          fieldName: "text",
          fieldType: "STRING",
          fieldValue: "test",
        },
      ];
      await client.submitTask(MOCK_APP_ID, nodeInfoList);

      // 第一次查询 - 运行中
      const runningResult = await client.queryTask(taskId);
      expect(runningResult.code).toBe(804);

      // 第二次查询 - 成功
      const successResult = await client.queryTask(taskId);
      expect(successResult.code).toBe(0);
    });
  });

  describe("rh_upload_media", () => {
    it("应该成功上传文件", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: { fileName: "uploaded_file.png" },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createTestClient();
      const fileData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await client.uploadFile(fileData, "image/png");

      expect(result.code).toBe(0);
      expect(result.data?.fileName).toBe("uploaded_file.png");
    });

    it("应该正确构造 FormData", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: { fileName: "test" } }),
      });

      const client = createTestClient();
      const fileData = new Uint8Array([1, 2, 3]);
      await client.uploadFile(fileData, "image/png");

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toContain("/task/openapi/upload");
      expect(callArgs[1].method).toBe("POST");
    });
  });

  describe("rh_query_task", () => {
    it("应该返回任务状态", async () => {
      const taskId = "task_status_test";

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: [{ taskId, status: "SUCCESS", fileUrl: "https://example.com/result.png" }],
        }),
      });

      const client = createTestClient();
      const result = await client.queryTask(taskId);

      expect(result.code).toBe(0);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.taskId).toBe(taskId);
    });

    it("应该处理不存在的任务", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 404, msg: "Task not found" }),
      });

      const client = createTestClient();
      const result = await client.queryTask("nonexistent");

      expect(result.code).toBe(404);
    });
  });

  describe("并发请求处理", () => {
    it("应该正确处理并发请求", async () => {
      const taskCount = 5;
      const responses = Array.from({ length: taskCount }, (_, i) => ({
        code: 0,
        data: { taskId: `task_${i}` },
      }));

      let callCount = 0;
      fetchMock.mockImplementation(async () => ({
        ok: true,
        json: async () => responses[callCount++],
      }));

      const client = createTestClient();
      const promises = Array.from({ length: taskCount }, (_, i) =>
        client.submitTask(MOCK_APP_ID, [])
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(taskCount);
      results.forEach((r, i) => {
        expect(r.code).toBe(0);
      });
    });
  });

  describe("错误恢复", () => {
    it("应该处理网络超时", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

      const client = createTestClient();
      await expect(client.getAppInfo(MOCK_APP_ID)).rejects.toThrow("Network timeout");
    });

    it("应该处理无效响应", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError("Invalid JSON");
        },
      });

      const client = createTestClient();
      await expect(client.getAppInfo(MOCK_APP_ID)).rejects.toThrow();
    });
  });
});
