import { z } from "zod";
import { RunningHubClient } from "../api/client.js";
import { NodeInfo, RetryConfig, AppConfig, StorageConfig } from "../types.js";
import { processOutput, ensureOutputDir } from "../utils/storage.js";

const ExecuteAppSchema = z.object({
  appId: z.string().optional().describe("APP ID"),
  alias: z.string().optional().describe("APP别名"),
  params: z.record(z.any()).describe("参数键值对"),
  mode: z
    .enum(["sync", "async"])
    .optional()
    .default("sync")
    .describe("执行模式"),
});

export const executeAppTool = {
  name: "rh_execute_app",
  description: "执行APP任务，支持同步等待和异步返回taskId",
  inputSchema: ExecuteAppSchema,

  async handler(
    args: z.infer<typeof ExecuteAppSchema>,
    client: RunningHubClient,
    config: {
      apps: Record<string, AppConfig>;
      retry: RetryConfig;
      storage: StorageConfig;
    },
  ) {
    // 1. 解析APP ID
    const appId = args.appId || config.apps[args.alias || ""]?.appId;
    if (!appId) {
      throw new Error("需要提供 appId 或有效的 alias");
    }

    // 2. 构建nodeInfoList
    const appConfig =
      config.apps[
        Object.keys(config.apps).find((k) => config.apps[k].appId === appId) ||
          ""
      ];

    const nodeInfoList: NodeInfo[] = [];
    if (appConfig?.inputs) {
      for (const [paramName, paramConfig] of Object.entries(appConfig.inputs)) {
        const value = args.params[paramName] ?? paramConfig.default;
        if (value !== undefined) {
          nodeInfoList.push({
            nodeId: paramConfig.nodeId,
            fieldName: paramConfig.fieldName,
            fieldValue:
              typeof value === "object" ? JSON.stringify(value) : String(value),
          } as NodeInfo);
        }
      }
    }

    // 3. 提交任务
    const submitResult = await client.submitTask(appId, nodeInfoList);
    if (submitResult.code !== 0) {
      throw new Error(`提交任务失败: ${submitResult.msg}`);
    }

    const taskId = (submitResult as any).data.taskId;

    // 4. 异步模式直接返回
    if (args.mode === "async") {
      return { taskId, status: "ACCEPTED" };
    }

    // 5. 同步模式：轮询等待结果
    const startTime = Date.now();
    const maxWait =
      (appConfig as any).retry?.maxWaitTime || config.retry.maxWaitTime;
    const interval =
      (appConfig as any).retry?.interval || config.retry.interval;
    const maxRetries =
      (appConfig as any).retry?.maxRetries || config.retry.maxRetries;

    let retries = 0;
    while (Date.now() - startTime < maxWait * 1000) {
      const result = await client.queryTask(taskId);

      if (result.code === 0 && result.data) {
        // 6. 根据存储模式处理生成物
        const storageMode = config.storage?.mode || "local";
        const outputPath = config.storage?.path || "./output";

        // 确保输出目录存在
        if (storageMode === "local" || storageMode === "auto") {
          ensureOutputDir(outputPath);
        }

        const processedOutputs = [];
        for (let i = 0; i < result.data.length; i++) {
          const output = result.data[i] as any;
          if (output.fileUrl) {
            const processed = await processOutput(
              output.fileUrl,
              `${i + 1}`,
              config.storage,
              taskId,
            );
            processedOutputs.push({
              ...output,
              originalUrl: processed.originalUrl,
              localPath: processed.localPath,
              storageMode: processed.mode,
            });
          } else {
            processedOutputs.push(output);
          }
        }

        return { taskId, status: "SUCCESS", outputs: processedOutputs };
      }

      if (result.code === 805) {
        throw new Error(`任务失败: ${JSON.stringify(result.data)}`);
      }

      if (result.code === 804 || result.code === 813) {
        await new Promise((r) => setTimeout(r, interval * 1000));
        continue;
      }

      if (result.code === 421 || result.code === 415) {
        if (retries < maxRetries) {
          retries++;
          await new Promise((r) => setTimeout(r, interval * 1000));
          continue;
        }
        throw new Error(`并发限制，重试${maxRetries}次后仍失败`);
      }

      throw new Error(`查询任务失败: ${result.msg}`);
    }

    throw new Error(`任务超时 (${maxWait}秒)`);
  },
};
