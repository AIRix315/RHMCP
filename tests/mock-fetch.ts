/**
 * 测试辅助工具 - Mock Fetch
 * 模拟 RunningHub API 响应
 */

import { vi } from "vitest";

/**
 * Mock 响应类型
 */
export interface MockResponse {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}

/**
 * 创建 Mock fetch 函数
 */
export function createMockFetch(): {
  fetch: typeof fetch;
  mockResponses: Map<string, MockResponse>;
  setResponse: (url: string, response: MockResponse) => void;
  setSuccess: (url: string, data: unknown) => void;
  setError: (url: string, error: string) => void;
  clear: () => void;
  callHistory: Array<{ url: string; options?: RequestInit }>;
} {
  const mockResponses = new Map<string, MockResponse>();
  const callHistory: Array<{ url: string; options?: RequestInit }> = [];

  const mockFetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = url instanceof URL ? url.toString() : url instanceof Request ? url.url : url;
    callHistory.push({ url: urlString, options });

    const response = mockResponses.get(urlString);

    if (response) {
      return {
        ok: response.ok ?? true,
        status: response.status ?? 200,
        json: response.json ?? (async () => response),
        text: response.text ?? (async () => JSON.stringify(response)),
      } as Response;
    }

    // 默认成功响应
    return {
      ok: true,
      status: 200,
      json: async () => ({ code: 0, msg: "success", data: {} }),
      text: async () => JSON.stringify({ code: 0, msg: "success", data: {} }),
    } as Response;
  });

  return {
    fetch: mockFetch,
    mockResponses,
    setResponse: (url: string, response: MockResponse) => {
      mockResponses.set(url, response);
    },
    setSuccess: (url: string, data: unknown) => {
      mockResponses.set(url, {
        ok: true,
        status: 200,
        json: async () => data,
      });
    },
    setError: (url: string, errorMsg: string) => {
      mockResponses.set(url, {
        ok: true,
        status: 200,
        json: async () => ({ code: 500, msg: errorMsg, data: null }),
      });
    },
    clear: () => {
      mockResponses.clear();
      callHistory.length = 0;
    },
    callHistory,
  };
}

/**
 * Mock 全局 fetch
 */
export function mockGlobalFetch() {
  const { fetch, setResponse, setSuccess, setError, clear, callHistory } = createMockFetch();

  beforeAll(() => {
    vi.stubGlobal("fetch", fetch);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    clear();
  });

  return { setResponse, setSuccess, setError, clear, callHistory, fetch };
}
