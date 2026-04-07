/**
 * APP 匹配器
 *
 * 根据 category、keywords 匹配 APP
 * 查询 rules 获取模型能力，结合 apps.json 查找最佳匹配
 */

import type { AppConfig, ModelRule } from "../types.js";

export interface MatchResult {
  /** 匹配到的 APP 列表 */
  matches: Array<{
    alias: string;
    app: AppConfig;
    matchedKeywords: string[];
    score: number;
  }>;
  /** 匹配原因说明 */
  reason: string;
}

export interface AppWithAlias {
  alias: string;
  app: AppConfig;
}

/**
 * 匹配 APP
 *
 * @param apps APP 配置列表
 * @param rules 模型规则
 * @param category 类别：image / video / audio
 * @param keywords 关键词列表，如 ["4K", "高清"]
 * @param index 编号（可选），如 "002"
 * @param alias 别名（可选），如 "qwen-text-to-image"
 */
export function matchApp(
  apps: Record<string, AppConfig>,
  rules: Record<string, ModelRule>,
  category: "image" | "video" | "audio",
  keywords: string[] = [],
  options?: {
    /** 指定编号，如 "002" */
    index?: string;
    /** 指定别名，如 "qwen-text-to-image" */
    alias?: string;
  }
): MatchResult {
  const appList: AppWithAlias[] = Object.entries(apps)
    .filter(([, app]) => app.category === category)
    .map(([alias, app]) => ({ alias, app }));

  // 1. 优先按编号匹配
  if (options?.index) {
    const idx = parseInt(options.index, 10);
    if (!isNaN(idx) && idx > 0 && idx <= appList.length) {
      const matched = appList[idx - 1];
      return {
        matches: [
          {
            alias: matched.alias,
            app: matched.app,
            matchedKeywords: [],
            score: 100,
          },
        ],
        reason: `按编号 ${options.index} 匹配`,
      };
    }
  }

  // 2. 优先按别名匹配
  if (options?.alias) {
    const matched = appList.find((a) => a.alias === options.alias);
    if (matched) {
      return {
        matches: [
          {
            alias: matched.alias,
            app: matched.app,
            matchedKeywords: [],
            score: 100,
          },
        ],
        reason: `按别名 "${options.alias}" 匹配`,
      };
    }
  }

  // 3. 无关键词时，返回所有该类别的 APP
  if (keywords.length === 0) {
    return {
      matches: appList.map((a) => ({
        alias: a.alias,
        app: a.app,
        matchedKeywords: [],
        score: 0,
      })),
      reason: `未指定关键词，返回 ${category} 类别所有 APP`,
    };
  }

  // 4. 按关键词匹配
  const matches: MatchResult["matches"] = [];

  for (const { alias, app } of appList) {
    const rule = app.modelFamily ? rules[app.modelFamily] : null;

    // 收集所有可匹配文本
    const allTexts: string[] = [
      app.description || "",
      app.usageType || "",
      app.webappName || "",
      ...(app.tags || []),
      ...(rule?.capabilities || []),
      ...(rule?.useCases || []),
    ].map((t) => t.toLowerCase());

    const combinedText = allTexts.join(" ");

    // 匹配关键词
    const matchedKeywords = keywords.filter((k) => combinedText.includes(k.toLowerCase()));

    if (matchedKeywords.length > 0) {
      // 计算匹配分数
      const score =
        matchedKeywords.length * 10 +
        (rule?.capabilities?.some((c) =>
          keywords.some((k) => c.toLowerCase().includes(k.toLowerCase()))
        )
          ? 5
          : 0) +
        (rule?.useCases?.some((u) =>
          keywords.some((k) => u.toLowerCase().includes(k.toLowerCase()))
        )
          ? 5
          : 0);

      matches.push({
        alias,
        app,
        matchedKeywords,
        score,
      });
    }
  }

  // 按分数降序排列
  matches.sort((a, b) => b.score - a.score);

  return {
    matches,
    reason:
      matches.length === 0
        ? `未找到匹配 "${keywords.join(", ")}" 的 ${category} APP`
        : matches.length === 1
          ? `找到 1 个匹配的 APP`
          : `找到 ${matches.length} 个匹配的 APP，按相关度排序`,
  };
}

/**
 * 从用户请求提取类别和关键词
 */
export function extractIntent(userRequest: string): {
  category: "image" | "video" | "audio" | null;
  keywords: string[];
} {
  const text = userRequest.toLowerCase();

  // 提取类别
  let category: "image" | "video" | "audio" | null = null;

  if (/图片|图像|图|画|绘|生成图|文生图|图生图|改图|高清|4k|超分/i.test(text)) {
    category = "image";
  } else if (/视频|影|动画|数字人|口播|生视频/i.test(text)) {
    category = "video";
  } else if (/音频|语音|音乐|配音|tts|声音/i.test(text)) {
    category = "audio";
  }

  // 提取关键词（去掉类别词后的有意义词）
  const keywordPatterns = [
    "4k",
    "1080p",
    "高清",
    "超分",
    "大图",
    "数字人",
    "口播",
    "主播",
    "文生图",
    "图生图",
    "改图",
    "长视频",
    "短视频",
    "中文",
    "英文",
    "多语",
  ];

  const keywords: string[] = [];
  for (const pattern of keywordPatterns) {
    if (text.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  return { category, keywords };
}

/**
 * 格式化匹配结果供用户选择
 */
export function formatMatchResult(result: MatchResult): string {
  if (result.matches.length === 0) {
    return `${result.reason}\n可用命令：rh_list_apps 查看所有 APP`;
  }

  if (result.matches.length === 1) {
    const m = result.matches[0];
    return `${result.reason}\n- ${m.alias}: ${m.app.description || m.app.usageType || m.app.webappName}`;
  }

  const lines = [result.reason];
  result.matches.forEach((m, i) => {
    const desc = m.app.description || m.app.usageType || m.app.webappName || "";
    const shortDesc = desc.length > 50 ? desc.substring(0, 50) + "..." : desc;
    lines.push(`${i + 1}. ${m.alias}: ${shortDesc}`);
    if (m.matchedKeywords.length > 0) {
      lines.push(`   匹配: ${m.matchedKeywords.join(", ")}`);
    }
  });
  lines.push("请选择编号或别名执行");

  return lines.join("\n");
}
