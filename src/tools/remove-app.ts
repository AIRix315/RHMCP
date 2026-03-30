import { z } from "zod";
import { readFileSync, writeFileSync } from "fs";

const RemoveAppSchema = z.object({
  appId: z.string().optional().describe("APP ID"),
  alias: z.string().optional().describe("APP别名"),
});

export const removeAppTool = {
  name: "rh_remove_app",
  description: "删除APP配置",
  inputSchema: RemoveAppSchema,

  async handler(args: z.infer<typeof RemoveAppSchema>, configPath?: string) {
    // 1. 检查配置路径
    if (!configPath) {
      throw new Error(
        "配置文件路径未设置，无法删除 APP。请设置 CONFIG_PATH 环境变量或使用新配置格式。"
      );
    }

    // 2. 读取配置
    const configContent = readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);

    if (!config.apps) {
      throw new Error("配置文件中没有apps部分");
    }

    // 2. 查找要删除的APP
    let keyToDelete: string | null = null;

    if (args.alias) {
      // 通过别名删除
      if (config.apps[args.alias]) {
        keyToDelete = args.alias;
      } else {
        throw new Error(`别名 "${args.alias}" 不存在`);
      }
    } else if (args.appId) {
      // 通过ID删除
      for (const [key, app] of Object.entries(config.apps)) {
        if ((app as { appId: string }).appId === args.appId) {
          keyToDelete = key;
          break;
        }
      }
      if (!keyToDelete) {
        throw new Error(`APP ID "${args.appId}" 不存在`);
      }
    } else {
      throw new Error("需要提供 appId 或 alias");
    }

    // 3. 删除APP
    const deletedApp = config.apps[keyToDelete];
    delete config.apps[keyToDelete];

    // 4. 保存配置
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      deleted: keyToDelete,
      app: deletedApp,
    };
  },
};
