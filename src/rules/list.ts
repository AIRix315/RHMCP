import { z } from 'zod';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import type { RunningHubConfig } from '../types.js';

const ListRulesSchema = z.object({
  category: z.enum(['image', 'audio', 'video']).optional().describe('筛选类别'),
});

export const listRulesTool = {
  name: 'rh_list_rules',
  description: '列出所有可用的模型规则',
  inputSchema: ListRulesSchema,
  
  async handler(
    args: z.infer<typeof ListRulesSchema>,
    config: RunningHubConfig
  ) {
    const rulesDir = join(config.storage.path, 'model-rules-cache');
    
    // 读取索引
    let index: any = {};
    try {
      const indexPath = join(rulesDir, 'index.json');
      const indexContent = await readFile(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    } catch {
      // 索引不存在，返回空
    }
    
    // 读取所有规则文件
    const rules: any[] = [];
    try {
      const files = await readdir(rulesDir);
      for (const file of files) {
        if (!file.endsWith('.json') || file === 'index.json') continue;
        
        const filePath = join(rulesDir, file);
        const content = await readFile(filePath, 'utf-8');
        const rule = JSON.parse(content);
        
        // 筛选类别
        if (args.category && rule.category !== args.category) continue;
        
        rules.push({
          name: rule.name,
          category: rule.category,
          description: rule.description,
        });
      }
    } catch (error) {
      // 目录不存在
    }
    
    return {
      version: index.version || 'unknown',
      updated: index.updated || 'unknown',
      count: rules.length,
      rules,
    };
  }
};