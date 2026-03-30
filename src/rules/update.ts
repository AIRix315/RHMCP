import { z } from "zod";
import { ensureDir, writeFileFunc } from "../utils/fs.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ModelRule, RunningHubConfig } from "../types.js";
import { existsSync } from "fs";

const UpdateRulesSchema = z.object({
  model: z.string().optional().describe("模型名称（可选，不填则更新全部）"),
  source: z.enum(["local", "github"]).optional().default("local").describe("规则来源"),
});

interface RulesIndex {
  version: string;
  updated: string;
  source?: string;
  models: Record<string, { file: string; category: string; description?: string }>;
}

// GitHub 仓库地址（正确的格式）
const GITHUB_REPO_OWNER = "AIRix315";
const GITHUB_REPO_NAME = "RHMCP";
const GITHUB_RULES_BRANCH = "main";
const GITHUB_RULES_PATH = "rules";

// 获取本地 rules 目录
function getLocalRulesDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "..", "..", "rules");
}

// GitHub Raw URL
function getGitHubUrl(filePath: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_RULES_BRANCH}/${GITHUB_RULES_PATH}/${filePath}`;
}

export interface UpdateRulesResult {
  version: string;
  updated: string;
  results: Array<{ model: string; status: string }>;
}

export const updateRulesTool = {
  name: "rh_update_rules",
  description: "更新模型规则库（支持本地和GitHub来源）",
  inputSchema: UpdateRulesSchema,

  async handler(
    args: z.infer<typeof UpdateRulesSchema>,
    config: RunningHubConfig
  ): Promise<UpdateRulesResult> {
    const source = args.source || "local";
    const localRulesDir = getLocalRulesDir();
    const cacheDir = join(config.storage.path, "model-rules-cache");

    // 确保缓存目录存在
    await ensureDir(cacheDir);

    let index: RulesIndex;

    // 1. 加载索引文件
    if (source === "github") {
      // 从 GitHub 下载索引
      const indexUrl = getGitHubUrl("index.json");
      const indexResponse = await fetch(indexUrl);
      if (!indexResponse.ok) {
        throw new Error(`从 GitHub 下载索引失败: ${indexResponse.status}`);
      }
      index = await indexResponse.json();
    } else {
      // 从本地读取索引
      const indexPath = join(localRulesDir, "index.json");
      if (!existsSync(indexPath)) {
        throw new Error("本地规则索引不存在，请使用 source: 'github' 从 GitHub 更新");
      }
      const indexContent = await import("fs/promises").then((m) => m.readFile(indexPath, "utf-8"));
      index = JSON.parse(indexContent);
    }

    // 2. 确定要更新的模型
    const modelsToUpdate = args.model ? [args.model] : Object.keys(index.models);

    const results: Array<{ model: string; status: string }> = [];

    // 3. 处理每个规则
    for (const model of modelsToUpdate) {
      const modelInfo = index.models[model];
      if (!modelInfo) {
        results.push({ model, status: "NOT_FOUND" });
        continue;
      }

      try {
        let ruleContent: string;

        if (source === "github") {
          // 从 GitHub 下载
          const ruleUrl = getGitHubUrl(modelInfo.file);
          const response = await fetch(ruleUrl);
          if (!response.ok) {
            results.push({
              model,
              status: `DOWNLOAD_FAILED: ${response.status}`,
            });
            continue;
          }
          ruleContent = await response.text();
        } else {
          // 从本地读取
          const localPath = join(localRulesDir, modelInfo.file);
          if (!existsSync(localPath)) {
            results.push({ model, status: "LOCAL_FILE_NOT_FOUND" });
            continue;
          }
          ruleContent = await import("fs/promises").then((m) => m.readFile(localPath, "utf-8"));
        }

        // 验证 JSON 格式
        const rule: ModelRule = JSON.parse(ruleContent);

        // 保存到缓存目录
        const cachePath = join(cacheDir, `${model}.json`);
        await writeFileFunc(cachePath, JSON.stringify(rule, null, 2));
        results.push({ model, status: "UPDATED" });
      } catch (error) {
        results.push({ model, status: `ERROR: ${error}` });
      }
    }

    // 4. 保存索引副本到缓存
    const cachedIndexPath = join(cacheDir, "index.json");
    await writeFileFunc(cachedIndexPath, JSON.stringify(index, null, 2));

    return {
      version: index.version,
      updated: index.updated,
      results,
    };
  },
};
