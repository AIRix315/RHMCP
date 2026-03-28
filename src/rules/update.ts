import { z } from 'zod';
import { ensureDir, writeFileFunc, downloadFile } from '../utils/fs.js';
import { join } from 'path';
import { ModelRule, RunningHubConfig } from '../types.js';

const UpdateRulesSchema = z.object({
  model: z.string().optional().describe('模型名称（可选，不填则更新全部）'),
});

interface RulesIndex {
  version: string;
  updated: string;
  models: Record<string, { file: string; category: string }>;
}

const GITHUB_RULES_REPO = 'https://raw.githubusercontent.com/runninghub-model-rules/main';

export interface UpdateRulesResult {
  version: string;
  updated: string;
  results: Array<{ model: string; status: string }>;
}

export const updateRulesTool = {
  name: 'rh_update_rules',
  description: '从GitHub更新模型规则库',
  inputSchema: UpdateRulesSchema,

  async handler(
    args: z.infer<typeof UpdateRulesSchema>,
    config: RunningHubConfig
  ): Promise<UpdateRulesResult> {
    const rulesDir = join(config.storage.path, 'model-rules-cache');
    await ensureDir(rulesDir);

    // 1. 下载索引文件
    const indexUrl = `${GITHUB_RULES_REPO}/index.json`;
    const indexResponse = await fetch(indexUrl);
    if (!indexResponse.ok) {
      throw new Error(`下载索引失败: ${indexResponse.status}`);
    }
    const index: RulesIndex = await indexResponse.json();

    // 2. 确定要更新哪些模型
    const modelsToUpdate = args.model
      ? [args.model]
      : Object.keys(index.models);

    const results: Array<{ model: string; status: string }> = [];

    // 3. 下载规则文件
    for (const model of modelsToUpdate) {
      const modelInfo = index.models[model];
      if (!modelInfo) {
        results.push({ model, status: 'NOT_FOUND' });
        continue;
      }

      try {
        const ruleUrl = `${GITHUB_RULES_REPO}/${modelInfo.file}`;
        const ruleResponse = await fetch(ruleUrl);
        if (!ruleResponse.ok) {
          results.push({ model, status: 'DOWNLOAD_FAILED' });
          continue;
        }

        const rule: ModelRule = await ruleResponse.json();
        const localPath = join(rulesDir, `${model}.json`);

        // 保存到本地
        await downloadFile(ruleUrl, localPath);
        results.push({ model, status: 'UPDATED' });
      } catch (error) {
        results.push({ model, status: `ERROR: ${error}` });
      }
    }

    // 4. 保存索引副本
    const indexPath = join(rulesDir, 'index.json');
    await writeFileFunc(indexPath, JSON.stringify(index, null, 2));

    return {
      version: index.version,
      updated: index.updated,
      results,
    };
  }
};