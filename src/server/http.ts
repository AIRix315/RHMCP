/**
 * HTTP 模式入口
 * 用于 HTTP API 访问和云部署
 */

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "../api/client.js";
import { loadConfig } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { createServer, registerTools, registerResources } from "./register.js";

// CONFIG_PATH 用于传递配置目录，默认为 undefined（自动检测）
const CONFIG_PATH = process.env.CONFIG_PATH ?? process.env.RHMCP_CONFIG ?? undefined;

// 会话管理常量
const MAX_SESSIONS = 100;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟

interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
}

export async function startHttpServer(port?: number): Promise<void> {
  // 1. 加载配置（异步）
  console.log("Loading configuration...");
  const config = await loadConfig(CONFIG_PATH);

  // 2. 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Configuration validation failed:");
    validation.errors.forEach((e) => console.error(`  ❌ ${e}`));
    process.exit(1);
  }
  validation.warnings.forEach((w) => console.warn(`  ⚠️ ${w}`));

  // 3. 创建客户端
  console.log("Initializing RunningHub client...");
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

  // 6. 创建 Express 应用
  console.log("Starting HTTP server...");
  const app = express();
  app.use(express.json());

  // 7. 会话管理
  const transports: Record<string, SessionInfo> = {};

  // 定期清理过期会话
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [id, session] of Object.entries(transports)) {
      if (now - session.createdAt > SESSION_TIMEOUT_MS) {
        delete transports[id];
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }, 60 * 1000); // 每分钟检查一次

  // 确保服务器关闭时清理定时器
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
  });

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    try {
      if (sessionId && transports[sessionId]) {
        // 复用现有会话
        await transports[sessionId].transport.handleRequest(req, res, req.body);
      } else {
        // 检查最大连接数限制
        if (Object.keys(transports).length >= MAX_SESSIONS) {
          res.status(503).json({ error: "Too many connections. Please try again later." });
          return;
        }

        // 创建新会话
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            transports[id] = { transport, createdAt: Date.now() };
            console.log(`Session initialized: ${id}`);
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            console.log(`Session closed: ${transport.sessionId}`);
          }
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      }
    } catch (error) {
      console.error("MCP request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 健康检查
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 8. 启动服务器
  const serverPort = port ?? parseInt(process.env.PORT ?? "3000", 10);
  app.listen(serverPort, () => {
    console.log("");
    console.log("✅ RHMCP started successfully! (HTTP mode)");
    console.log(`   MCP endpoint: http://localhost:${serverPort}/mcp`);
    console.log(`   Health check: http://localhost:${serverPort}/health`);
    console.log("");
  });
}
