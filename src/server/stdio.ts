/**
 * STDIO 模式入口
 * 用于 CLI 工具和 MCP 客户端集成
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "../api/client.js";
import { loadConfig } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { createServer, registerTools, registerResources } from "./register.js";

// CONFIG_PATH 用于传递配置目录，默认为 undefined（自动检测）
const CONFIG_PATH = process.env.CONFIG_PATH ?? process.env.RHMCP_CONFIG ?? undefined;

export async function startStdioServer(): Promise<void> {
  // 1. 加载配置（异步）
  console.error("Loading configuration..."); // 使用 stderr 避免 stdout 污染
  const config = await loadConfig(CONFIG_PATH);

  // 2. 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Configuration validation failed:");
    validation.errors.forEach((e) => console.error(`  ❌ ${e}`));
    process.exit(1);
  }
  validation.warnings.forEach((w) => console.error(`  ⚠️ ${w}`));

  // 3. 创建客户端
  console.error("Initializing RunningHub client...");
  const client = createClient(config);

  // 4. 创建 MCP 服务器
  const server = createServer();

  // 5. 注册工具和资源
  registerTools({
    server,
    client,
    config,
    configPath: CONFIG_PATH,
  });
  registerResources({
    server,
    client,
    config,
    configPath: CONFIG_PATH,
  });

  // 6. 使用 STDIO Transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ RHMCP started (STDIO mode)");
}
