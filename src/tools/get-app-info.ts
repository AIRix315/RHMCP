import { z } from 'zod';
import { RunningHubClient } from '../api/client.js';

const GetAppInfoSchema = z.object({
  appId: z.string().optional().describe('APP ID (可选，可通过别名查询)'),
  alias: z.string().optional().describe('APP别名 (可选，可通过ID查询)'),
});

export const getAppInfoTool = {
  name: 'rh_get_app_info',
  description: '获取APP的详细配置信息，包含参数列表、模型规则、约束条件',
  inputSchema: GetAppInfoSchema,
  
  async handler(
    args: z.infer<typeof GetAppInfoSchema>, 
    client: RunningHubClient,
    config: { apps: Record<string, { appId: string }> }
  ) {
    // 1. 解析APP ID（支持别名）
    const appId = args.appId || config.apps[args.alias || '']?.appId;
    if (!appId) {
      throw new Error('需要提供 appId 或有效的 alias');
    }
    
    // 2. 调用API
    const result = await client.getAppInfo(appId);
    
    if (result.code !== 0) {
      throw new Error(`获取APP信息失败: ${result.msg}`);
    }
    
    if (!result.data) {
      throw new Error('获取APP信息失败: 返回数据为空');
    }
    
    // 3. 返回完整配置
    return {
      appId: appId,
      webappName: result.data.webappName,
      description: result.data.description,
      nodeInfoList: result.data.nodeInfoList,
      covers: result.data.covers,
    };
  }
};