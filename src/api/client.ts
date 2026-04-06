import { NodeInfo, ApiResponse, TaskResult, RunningHubConfig, AppInfoResponse } from "../types.js";

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
   * 获取APP配置
   */
  async getAppInfo(webappId: string): Promise<ApiResponse<AppInfoResponse>> {
    const url = `https://${this.baseUrl}/api/webapp/apiCallDemo?apiKey=${this.apiKey}&webappId=${webappId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`获取APP信息失败: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 上传文件
   */
  async uploadFile(file: Uint8Array, fileType: string): Promise<ApiResponse<{ fileName: string }>> {
    const formData = new FormData();
    formData.append("apiKey", this.apiKey);
    formData.append("fileType", fileType);
    // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(file.length);
    new Uint8Array(arrayBuffer).set(file);
    formData.append("file", new Blob([arrayBuffer]), "upload");

    const response = await fetch(`https://${this.baseUrl}/task/openapi/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`上传文件失败: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 提交任务
   */
  async submitTask(
    webappId: string,
    nodeInfoList: NodeInfo[]
  ): Promise<ApiResponse<{ taskId: string }>> {
    await this.acquireSlot();

    try {
      const response = await fetch(`https://${this.baseUrl}/task/openapi/ai-app/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webappId,
          apiKey: this.apiKey,
          nodeInfoList,
        }),
      });
      if (!response.ok) {
        throw new Error(`提交任务失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * 查询任务
   */
  async queryTask(taskId: string): Promise<ApiResponse<TaskResult[]>> {
    const response = await fetch(`https://${this.baseUrl}/task/openapi/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: this.apiKey,
        taskId,
      }),
    });
    if (!response.ok) {
      throw new Error(`查询任务失败: ${response.status} ${response.statusText}`);
    }
    return response.json();
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
