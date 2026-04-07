import { NodeInfo, ApiResponse, TaskResult, RunningHubConfig, AppInfoResponse } from "../types.js";

/** API 调用超时（毫秒） */
const API_TIMEOUT = 5000;

/** GET 请求重试次数 */
const MAX_RETRIES = 3;

/** 重试间隔（毫秒） */
const RETRY_INTERVAL = 1000;

export class RunningHubClient {
  private apiKey: string;
  private baseUrl: string;
  private maxConcurrent: number;
  private activeRequests = 0;

  constructor(config: RunningHubConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.maxConcurrent = config.maxConcurrent;
  }

  /**
   * GET 请求：带超时和重试
   * 用于查询操作（getAppInfo, queryTask）
   */
  private async getWithRetry<T>(url: string): Promise<ApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return response.json();
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_INTERVAL));
        }
      }
    }

    throw lastError || new Error("请求失败");
  }

  /**
   * POST 请求：带超时，不重试
   * 用于提交操作（submitTask, uploadFile）
   * 不重试原因：防止重复提交任务
   */
  private async postOnce<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`请求失败: ${message}，请检查网络后重试`);
    }
  }

  /**
   * 获取APP配置（GET，可重试）
   */
  async getAppInfo(webappId: string): Promise<ApiResponse<AppInfoResponse>> {
    const url = `https://${this.baseUrl}/api/webapp/apiCallDemo?apiKey=${this.apiKey}&webappId=${webappId}`;
    return this.getWithRetry(url);
  }

  /**
   * 上传文件（POST，不重试）
   */
  async uploadFile(file: Uint8Array, fileType: string): Promise<ApiResponse<{ fileName: string }>> {
    const formData = new FormData();
    formData.append("apiKey", this.apiKey);
    formData.append("fileType", fileType);
    const arrayBuffer = new ArrayBuffer(file.length);
    new Uint8Array(arrayBuffer).set(file);
    formData.append("file", new Blob([arrayBuffer]), "upload");

    try {
      const response = await fetch(`https://${this.baseUrl}/task/openapi/upload`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`上传文件失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`上传文件失败: ${message}，请检查网络后重试`);
    }
  }

  /**
   * 提交任务（POST，不重试）
   * 不重试原因：防止重复提交
   */
  async submitTask(
    webappId: string,
    nodeInfoList: NodeInfo[]
  ): Promise<ApiResponse<{ taskId: string }>> {
    await this.acquireSlot();

    try {
      return await this.postOnce(`https://${this.baseUrl}/task/openapi/ai-app/run`, {
        webappId,
        apiKey: this.apiKey,
        nodeInfoList,
      });
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * 查询任务（GET，可重试）
   */
  async queryTask(taskId: string): Promise<ApiResponse<TaskResult[]>> {
    const url = `https://${this.baseUrl}/task/openapi/outputs`;
    return this.getWithRetry(`${url}?apiKey=${this.apiKey}&taskId=${taskId}`);
  }

  private async acquireSlot(): Promise<void> {
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise((r) => setTimeout(r, 100));
    }
    this.activeRequests++;
  }

  private releaseSlot(): void {
    this.activeRequests--;
  }
}

export function createClient(config: RunningHubConfig): RunningHubClient {
  return new RunningHubClient(config);
}
