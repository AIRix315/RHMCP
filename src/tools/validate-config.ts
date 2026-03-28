import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

const ValidateConfigSchema = z.object({
  configPath: z
    .string()
    .optional()
    .describe("配置文件路径（可选，默认使用标准路径）"),
});

export const validateConfigTool = {
  name: "rh_validate_config",
  description: "验证配置文件格式和完整性",
  inputSchema: ValidateConfigSchema,

  async handler(args: z.infer<typeof ValidateConfigSchema>) {
    // 1. 查找配置文件
    const configPath = args.configPath || findConfigFile();
    if (!configPath) {
      return {
        valid: false,
        errors: ["未找到配置文件 runninghub-mcp-config.json"],
        warnings: [],
      };
    }

    // 2. 读取并解析
    let config: any;
    try {
      const content = readFileSync(configPath, "utf-8");
      config = JSON.parse(content);
    } catch (error: any) {
      return {
        valid: false,
        errors: [`配置文件解析失败: ${error.message}`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 3. 验证必填项
    if (!config.apiKey) {
      errors.push("apiKey 是必填项");
    }
    if (!config.baseUrl) {
      errors.push("baseUrl 是必填项");
    }

    // 4. 验证APP配置
    if (config.apps) {
      for (const [alias, app] of Object.entries(config.apps)) {
        const a = app as any;
        if (!a.appId) {
          errors.push(`APP "${alias}" 缺少 appId`);
        }
        if (!a.category) {
          warnings.push(`APP "${alias}" 缺少 category`);
        }
        if (!a.inputs || Object.keys(a.inputs).length === 0) {
          warnings.push(`APP "${alias}" 没有定义 inputs`);
        }
      }
    } else {
      warnings.push("没有配置任何APP");
    }

    // 5. 验证存储配置
    if (config.storage) {
      if (!config.storage.path) {
        warnings.push("storage.path 未设置，将使用默认值");
      }
    }

    // 6. 验证重试配置
    if (config.retry) {
      if (config.retry.maxRetries < 0) {
        errors.push("retry.maxRetries 不能为负数");
      }
      if (config.retry.maxWaitTime < 0) {
        errors.push("retry.maxWaitTime 不能为负数");
      }
    }

    return {
      valid: errors.length === 0,
      configPath,
      errors,
      warnings,
      appCount: config.apps ? Object.keys(config.apps).length : 0,
    };
  },
};

function findConfigFile(): string | null {
  const cwd = process.cwd();
  const paths = [
    join(cwd, "runninghub-mcp-config.json"),
    join(cwd, "config", "runninghub-mcp-config.json"),
  ];
  for (const p of paths) {
    try {
      readFileSync(p, "utf-8");
      return p;
    } catch {}
  }
  return null;
}
