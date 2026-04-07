/**
 * API 客户端 E2E 测试
 * 测试 RunningHubClient 的完整请求流程
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RunningHubClient } from "../src/api/client.js";
import type { RunningHubConfig, NodeInfo } from "../src/types.js";
import {
  MOCK_API_KEY,
  MOCK_BASE_URL,
  MOCK_APP_ID,
  createMockConfig,
  createMockAppInfoResponse,
  createMockTaskSubmitResponse,
  createMockTaskSuccessResponse,
  createMockTaskRunningResponse,
  createMockTaskFailedResponse,
  createMockNodeInfoList,
} from "./fixtures.js";

/**
 * 创建最小测试配置
 */
function createMinimalConfig(): RunningHubConfig {
  return createMockConfig();
}

describe("RunningHubClient", () => {
  let client: RunningHubClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    client = new RunningHubClient(createMinimalConfig());
  });

  describe("构造函数", () => {
    it("应该正确初始化配置", () => {
      const testClient = new RunningHubClient(createMinimalConfig());
      expect(testClient).toBeDefined();
    });

    it("应该支持并发限制配置", () => {
      const testClient = new RunningHubClient(createMockConfig({ maxConcurrent: 10 }));
      expect(testClient).toBeDefined();
    });
  });

  describe("getAppInfo", () => {
    it("应该成功获取 APP 信息", async () => {
      const mockResponse = createMockAppInfoResponse();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getAppInfo(MOCK_APP_ID);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.code).toBe(0);
      expect(result.data?.webappName).toBe("Qwen 文生图");
      expect(result.data?.nodeInfoList).toBeDefined();
    });

    it("应该正确构造请求 URL", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: {} }),
      });

      await client.getAppInfo(MOCK_APP_ID);

      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain("api/webapp/apiCallDemo");
      expect(calledUrl).toContain(MOCK_API_KEY);
      expect(calledUrl).toContain(MOCK_APP_ID);
    });

    it("应该处理错误响应", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 401, msg: "Invalid API Key" }),
      });

      const result = await client.getAppInfo(MOCK_APP_ID);

      expect(result.code).toBe(401);
      expect(result.msg).toBe("Invalid API Key");
    });

    it("应该处理网络错误", async () => {
      // getWithRetry 会重试 MAX_RETRIES 次，需要 mock 所有重试
      fetchMock.mockRejectedValue(new Error("Network error"));

      await expect(client.getAppInfo(MOCK_APP_ID)).rejects.toThrow("Network error");
      // 重试 3 次 + 首次调用 = 4 次尝试
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe("uploadFile", () => {
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

      const fileData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await client.uploadFile(fileData, "image/png");

      expect(result.code).toBe(0);
      expect(result.data?.fileName).toBe("uploaded_file.png");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("应该正确设置请求参数", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: { fileName: "test.png" } }),
      });

      const fileData = new Uint8Array([1, 2, 3]);
      await client.uploadFile(fileData, "image/png");

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[0]).toContain("/task/openapi/upload");
    });
  });

  describe("submitTask", () => {
    it("应该成功提交任务", async () => {
      const taskId = "task_123456";
      const mockResponse = createMockTaskSubmitResponse(taskId);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const nodeInfoList = createMockNodeInfoList();
      const result = await client.submitTask(MOCK_APP_ID, nodeInfoList);

      expect(result.code).toBe(0);
      expect(result.data?.taskId).toBe(taskId);
    });

    it("应该正确构造任务提交请求", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: { taskId: "test" } }),
      });

      const nodeInfoList: NodeInfo[] = [
        {
          nodeId: "node_001",
          nodeName: "text_input",
          fieldName: "text",
          fieldType: "STRING",
          fieldValue: "test prompt",
        },
      ];

      await client.submitTask(MOCK_APP_ID, nodeInfoList);

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].headers).toEqual({ "Content-Type": "application/json" });

      const body = JSON.parse(callArgs[1].body);
      expect(body.webappId).toBe(MOCK_APP_ID);
      expect(body.apiKey).toBe(MOCK_API_KEY);
      expect(body.nodeInfoList).toEqual(nodeInfoList);
    });

    it("应该处理提交失败", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 400, msg: "Invalid parameters" }),
      });

      const result = await client.submitTask(MOCK_APP_ID, []);

      expect(result.code).toBe(400);
      expect(result.msg).toBe("Invalid parameters");
    });
  });

  describe("queryTask", () => {
    it("应该成功查询任务状态", async () => {
      const taskId = "task_123456";
      const mockResponse = createMockTaskSuccessResponse(taskId);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.queryTask(taskId);

      expect(result.code).toBe(0);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].status).toBe("SUCCESS");
    });

    it("应该正确构造查询请求", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 0, data: [] }),
      });

      const taskId = "task_test";
      await client.queryTask(taskId);

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toContain("/task/openapi/outputs");
      // queryTask 使用 GET 请求（带重试）
      expect(callArgs[1].method).toBeUndefined();
      expect(callArgs[0]).toContain(`taskId=${taskId}`);
      expect(callArgs[0]).toContain(`apiKey=${MOCK_API_KEY}`);
    });

    it("应该处理运行中的任务", async () => {
      const taskId = "task_running";
      const mockResponse = createMockTaskRunningResponse(taskId);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.queryTask(taskId);

      expect(result.code).toBe(804);
      expect(result.msg).toBe("RUNNING");
    });

    it("应该处理失败的任务", async () => {
      const taskId = "task_failed";
      const mockResponse = createMockTaskFailedResponse(taskId);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.queryTask(taskId);

      expect(result.code).toBe(805);
      expect(result.data?.[0].status).toBe("FAILED");
    });
  });

  describe("并发控制", () => {
    it("应该限制并发请求数", async () => {
      const maxConcurrent = 2;
      const clientWithLimit = new RunningHubClient(createMockConfig({ maxConcurrent }));

      let completedRequests = 0;
      let concurrentRequestCount = 0;
      let maxConcurrentSeen = 0;

      fetchMock.mockImplementation(async () => {
        concurrentRequestCount++;
        maxConcurrentSeen = Math.max(maxConcurrentSeen, concurrentRequestCount);

        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 50));

        concurrentRequestCount--;
        completedRequests++;

        return {
          ok: true,
          json: async () => ({ code: 0, data: { taskId: "test" } }),
        };
      });

      // 发起多个并发请求
      const promises = Array.from({ length: 5 }, () => clientWithLimit.submitTask(MOCK_APP_ID, []));

      await Promise.all(promises);

      expect(maxConcurrentSeen).toBeLessThanOrEqual(maxConcurrent);
      expect(completedRequests).toBe(5);
    });
  });

  describe("错误处理", () => {
    it("应该处理 JSON 解析错误", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      });

      await expect(client.getAppInfo(MOCK_APP_ID)).rejects.toThrow();
    });

    it("应该处理 HTTP 错误状态", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      // 客户端应该处理这种情况
      await expect(client.getAppInfo(MOCK_APP_ID)).rejects.toThrow();
    });
  });
});
