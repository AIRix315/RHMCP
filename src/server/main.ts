/**
 * RHMCP 主入口
 * 支持 STDIO、HTTP 和 CLI 三种模式
 */

import { startHttpServer } from "./http.js";
import { startStdioServer } from "./stdio.js";
import { updateApps } from "../cli/update-apps.js";
import { migrate, findLegacyConfig } from "../cli/migrate.js";
import { checkApp, formatCheckResult } from "../cli/check-app.js";
import { createClient } from "../api/client.js";
import { loadConfig } from "../config/loader.js";

// 进程级错误处理
process.on("uncaughtException", (error) => {
  console.error("[RHMCP] 未捕获的异常:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[RHMCP] 未处理的Promise拒绝:", reason);
  process.exit(1);
});

/**
 * 检测运行模式
 */
export function detectTransportMode(): "stdio" | "http" | "cli" {
  // CLI 命令优先检测
  if (process.argv.includes("--update-apps")) return "cli";
  if (process.argv.includes("--migrate")) return "cli";
  if (process.argv.includes("--check-app")) return "cli";

  // 传输模式检测
  if (process.argv.includes("--stdio")) return "stdio";
  if (process.env.MCP_TRANSPORT === "stdio") return "stdio";

  return "http";
}

/**
 * 显示使用帮助
 */
function showHelp(): void {
  console.log("");
  console.log("RHMCP v1.0.0 - RunningHub AI Platform MCP Server");
  console.log("");
  console.log("Usage:");
  console.log("  rhmcp                    Start HTTP server (default)");
  console.log("  rhmcp --stdio            Start STDIO server");
  console.log("  rhmcp --http             Start HTTP server");
  console.log("  rhmcp --update-apps      Update APP list from GitHub");
  console.log("  rhmcp --check-app <id>   Check APP compatibility");
  console.log("  rhmcp --migrate          Migrate old config to new format");
  console.log("  rhmcp --help             Show this help");
  console.log("");
  console.log("Environment Variables:");
  console.log("  MCP_TRANSPORT=stdio      Use STDIO mode");
  console.log("  MCP_TRANSPORT=http       Use HTTP mode");
  console.log("  RUNNINGHUB_API_KEY       API Key (overrides config)");
  console.log("  RHMCP_CONFIG=<path>      Configuration directory");
  console.log("  PORT=<port>              HTTP server port (default: 3000)");
  console.log("");
  console.log("Configuration:");
  console.log("  New format: service.json + apps.json + .env");
  console.log("  Old format: rhmcp-config.json (auto-migrated)");
  console.log("");
}

/**
 * 主入口
 */
export async function main(): Promise<void> {
  // 帮助参数
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  const mode = detectTransportMode();

  switch (mode) {
    case "cli":
      await handleCliCommand();
      break;
    case "stdio":
      await startStdioServer();
      break;
    case "http":
    default:
      await startHttpServer();
      break;
  }
}

/**
 * 处理 CLI 命令
 */
async function handleCliCommand(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--update-apps")) {
    const appsFileIndex = args.indexOf("--update-apps");
    const appsFile = args[appsFileIndex + 1] || "./apps.json";
    await updateApps(appsFile);
    process.exit(0);
  }

  if (args.includes("--check-app")) {
    const checkAppIndex = args.indexOf("--check-app");
    const appId = args[checkAppIndex + 1];

    if (!appId) {
      console.error("[RHMCP] 用法: rhmcp --check-app <appId>");
      process.exit(1);
    }

    try {
      const config = await loadConfig();
      const client = createClient(config);
      const result = await checkApp(appId, client);
      console.log(formatCheckResult(result));
      process.exit(0);
    } catch (error) {
      console.error(`[RHMCP] 检查失败: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  if (args.includes("--migrate")) {
    const migrateIndex = args.indexOf("--migrate");
    const oldConfigPath = args[migrateIndex + 1] || findLegacyConfig();

    if (oldConfigPath) {
      await migrate(oldConfigPath);
      process.exit(0);
    } else {
      console.error("[RHMCP] 未找到旧配置文件");
      console.error("[RHMCP] 用法: rhmcp --migrate <config-file>");
      process.exit(1);
    }
  }

  // 未知 CLI 命令
  console.error(`[RHMCP] 未知命令: ${args.join(" ")}`);
  showHelp();
  process.exit(1);
}
