/**
 * RunningHub MCP Server 主入口
 * 支持 STDIO 和 HTTP 两种传输模式
 */

import { startHttpServer } from "./http.js";
import { startStdioServer } from "./stdio.js";

/**
 * 检测运行模式
 * - 参数包含 --stdio 或环境变量 MCP_TRANSPORT=stdio → STDIO 模式
 * - 否则 → HTTP 模式
 */
export function detectTransportMode(): "stdio" | "http" {
  if (process.argv.includes("--stdio")) {
    return "stdio";
  }
  if (process.env.MCP_TRANSPORT === "stdio") {
    return "stdio";
  }
  // 默认使用 HTTP 模式（向后兼容）
  return "http";
}

/**
 * 显示使用帮助
 */
function showHelp(): void {
  console.log("");
  console.log("RunningHub MCP Server v1.0.0");
  console.log("");
  console.log("Usage:");
  console.log("  runninghub-mcp              Start HTTP server (default)");
  console.log("  runninghub-mcp --stdio     Start STDIO server");
  console.log("  runninghub-mcp --http      Start HTTP server");
  console.log("  runninghub-mcp --help      Show this help");
  console.log("");
  console.log("Environment Variables:");
  console.log("  MCP_TRANSPORT=stdio       Use STDIO mode");
  console.log("  MCP_TRANSPORT=http         Use HTTP mode");
  console.log("  CONFIG_PATH=<path>         Configuration file path");
  console.log("  PORT=<port>                HTTP server port (default: 3000)");
  console.log("");
  console.log("OpenCode Configuration (STDIO):");
  console.log('  "mcpServers": {');
  console.log('    "runninghub": {');
  console.log('      "command": "runninghub-mcp",');
  console.log('      "args": ["--stdio"],');
  console.log(
    '      "env": { "CONFIG_PATH": "/path/to/runninghub-mcp-config.json" }',
  );
  console.log("    }");
  console.log("  }");
  console.log("");
  console.log("OpenCode Configuration (HTTP):");
  console.log('  "mcpServers": {');
  console.log('    "runninghub": {');
  console.log('      "type": "http",');
  console.log('      "url": "http://localhost:3000/mcp"');
  console.log("    }");
  console.log("  }");
  console.log("");
}

export async function main(): Promise<void> {
  // 检查帮助参数
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  const mode = detectTransportMode();

  if (mode === "stdio") {
    await startStdioServer();
  } else {
    await startHttpServer();
  }
}
