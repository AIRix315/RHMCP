import { z } from "zod";
import { RunningHubClient } from "../api/client.js";

const QueryTaskSchema = z.object({
  taskId: z.string().describe("任务ID"),
});

export const queryTaskTool = {
  name: "rh_query_task",
  description: "查询任务状态和结果",
  inputSchema: QueryTaskSchema,

  async handler(
    args: z.infer<typeof QueryTaskSchema>,
    client: RunningHubClient,
  ) {
    const result = await client.queryTask(args.taskId);

    // 状态码映射
    const statusMap: Record<number, string> = {
      0: "SUCCESS",
      804: "RUNNING",
      805: "FAILED",
      813: "QUEUED",
      415: "INSTANCE_LIMITED",
      421: "QUEUE_FULL",
    };

    return {
      taskId: args.taskId,
      code: result.code,
      status: statusMap[result.code] || "UNKNOWN",
      msg: result.msg,
      data: result.data,
    };
  },
};
