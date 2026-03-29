import { z } from "zod";
import { join, dirname } from "path";
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import type { RunningHubConfig } from "../types.js";

const ListRulesSchema = z.object({
  category: z.enum(["image", "audio", "video"]).optional().describe("筛选类别"),
  source: z
    .enum(["local", "cache"])
    .optional()
    .default("local")
    .describe("规则来源"),
});

// 获取本地 rules 目录
function getLocalRulesDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "..", "..", "rules");
}

export const listRulesTool = {
  name: "rh_list_rules",
  description: "列出所有可用的模型规则（支持本地和缓存来源）",
  inputSchema: ListRulesSchema,

  async handler(
    args: z.infer<typeof ListRulesSchema>,
    config: RunningHubConfig,
  ) {
    // 确定规则目录
    let rulesDir: string;
    if (args.source === "cache") {
      rulesDir = join(config.storage.path, "model-rules-cache");
    } else {
      rulesDir = getLocalRulesDir();
    }

    // 读取索引
    let index: {
      version?: string;
      updated?: string;
      source?: string;
      models?: Record<string, { category: string; description?: string }>;
    } = {};
    const indexPath = join(rulesDir, "index.json");
    if (existsSync(indexPath)) {
      try {
        const indexContent = await readFile(indexPath, "utf-8");
        index = JSON.parse(indexContent);
      } catch {
        // 索引读取失败，继续
      }
    }

    // 读取所有规则文件
    const rules: Array<{
      name: string;
      category: string;
      description?: string;
    }> = [];
    try {
      const files = await readdir(rulesDir);

      for (const file of files) {
        if (!file.endsWith(".json") || file === "index.json") continue;

        const filePath = join(rulesDir, file);
        try {
          const content = await readFile(filePath, "utf-8");
          const rule = JSON.parse(content);

          // 筛选类别
          if (args.category && rule.category !== args.category) continue;

          rules.push({
            name: rule.name || file.replace(".json", ""),
            category: rule.category,
            description: rule.description,
          });
        } catch {
          // 解析失败，跳过
        }
      }
    } catch {
      // 目录不存在，返回空
    }

    return {
      version: index.version || "unknown",
      updated: index.updated || "unknown",
      source: index.source || "local",
      count: rules.length,
      rules,
    };
  },
};
