#!/usr/bin/env node
/**
 * RunningHub MCP Server 入口
 * 
 * 此文件保持向后兼容，默认启动 HTTP 模式
 * 
 * 新的推荐方式：
 * - STDIO 模式: 使用 runninghub-mcp --stdio
 * - HTTP 模式: 使用 runninghub-mcp --http 或 runninghub-mcp
 */

// 重导出所有模块
export { startStdioServer } from "./stdio.js";
export { startHttpServer } from "./http.js";
export { createServer, registerTools, registerResources } from "./register.js";
export { main, detectTransportMode } from "./main.js";

// 执行主入口
import { main } from "./main.js";

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});