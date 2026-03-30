import { z } from "zod";
import { RunningHubClient } from "../api/client.js";
import { RunningHubConfig, AppConfig } from "../types.js";

const GetAppInfoSchema = z.object({
  appId: z.string().optional().describe("APP ID (可选，可通过别名查询)"),
  alias: z.string().optional().describe("APP别名 (可选，可通过ID查询)"),
});

/**
 * 获取合并后的 APP 配置
 */
function getMergedApps(config: RunningHubConfig): Record<string, AppConfig> {
  // 优先使用新格式的 appsConfig
  if (config.appsConfig) {
    const merged: Record<string, AppConfig> = {};
    
    // 合并 server apps
    if (config.appsConfig.server) {
      for (const [alias, app] of Object.entries(config.appsConfig.server)) {
        if (!alias.startsWith('_')) {
          merged[alias] = app;
        }
      }
    }
    
    // 合并 user apps（覆盖 server 同名）
    if (config.appsConfig.user) {
      for (const [alias, app] of Object.entries(config.appsConfig.user)) {
        if (!alias.startsWith('_')) {
          merged[alias] = app;
        }
      }
    }
    
    return merged;
  }
  
  // 回退到旧格式
  return config.apps || {};
}

export const getAppInfoTool = {
  name: "rh_get_app_info",
  description: "获取APP的详细配置信息，包含参数列表、模型规则、约束条件",
  inputSchema: GetAppInfoSchema,

  async handler(
    args: z.infer<typeof GetAppInfoSchema>,
    client: RunningHubClient,
    config: RunningHubConfig,
  ) {
    const apps = getMergedApps(config);
    
    // 1. 解析APP ID（支持别名）
    const appId = args.appId || apps[args.alias || ""]?.appId;
    if (!appId) {
      throw new Error("需要提供 appId 或有效的 alias");
    }

    // 2. 调用API
    const result = await client.getAppInfo(appId);

    if (result.code !== 0) {
      throw new Error(`获取APP信息失败: ${result.msg}`);
    }

    if (!result.data) {
      throw new Error("获取APP信息失败: 返回数据为空");
    }

    // 3. 返回完整配置
    return {
      appId: appId,
      webappName: result.data.webappName,
      description: result.data.description,
      nodeInfoList: result.data.nodeInfoList,
      covers: result.data.covers,
    };
  },
};