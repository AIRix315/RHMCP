import { z } from "zod";
import { RunningHubClient } from "../api/client.js";
import { AppConfig } from "../types.js";

const AddAppSchema = z.object({
  appId: z.string().describe("APP ID"),
  alias: z.string().describe("APP别名"),
  modelFamily: z.string().optional().describe("模型系列（可选，用于自动导入规则）"),
  category: z.enum(["image", "audio", "video"]).describe("APP类别"),
});

export const addAppTool = {
  name: "rh_add_app",
  description: "注册新APP，自动获取参数配置",
  inputSchema: AddAppSchema,

  async handler(
    args: z.infer<typeof AddAppSchema>,
    client: RunningHubClient,
    _configPathOrConfig?: string | { apps: Record<string, AppConfig> }
  ) {
    // 1. 获取APP配置
    const result = await client.getAppInfo(args.appId);
    if (result.code !== 0) {
      throw new Error(`获取APP信息失败: ${result.msg}`);
    }

    if (!result.data) {
      throw new Error("获取APP信息失败: 返回数据为空");
    }

    // 2. 构建AppConfig
    const appConfig: AppConfig = {
      appId: args.appId,
      alias: args.alias,
      modelFamily: args.modelFamily,
      category: args.category,
      description: result.data.description,
      inputs: {},
    };

    // 3. 解析nodeInfoList转换inputs
    for (const node of result.data.nodeInfoList) {
      appConfig.inputs[node.fieldName] = {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        fieldName: node.fieldName,
        type: node.fieldType,
        description: node.description,
        descriptionEn: node.descriptionEn,
        default: node.fieldValue,
      };
    }

    // 4. 返回配置对象供外部保存
    return {
      success: true,
      appConfig,
      importedInputs: Object.keys(appConfig.inputs).length,
    };
  },
};
