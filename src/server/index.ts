import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient } from "../api/client.js";
import { loadConfig } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";

// 导入所有工具
import { uploadMediaTool } from "../tools/upload-media.js";
import { getAppInfoTool } from "../tools/get-app-info.js";
import { executeAppTool } from "../tools/execute-app.js";
import { queryTaskTool } from "../tools/query-task.js";
import { addAppTool } from "../tools/add-app.js";
import { removeAppTool } from "../tools/remove-app.js";
import { updateRulesTool } from "../rules/update.js";
import { listRulesTool } from "../rules/list.js";
import { validateConfigTool } from "../tools/validate-config.js";

// 类型导入
import type { RunningHubConfig } from "../types.js";

const CONFIG_PATH = process.env.CONFIG_PATH || "runninghub-mcp-config.json";

async function main() {
  // 1. 加载配置
  console.log("Loading configuration...");
  const config = loadConfig();

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

  // 4. 创建MCP服务器
  const server = new McpServer(
    {
      name: "runninghub-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // 5. 注册所有工具 - 使用 registerTool 方法
  // rh_upload_media
  server.registerTool(
    uploadMediaTool.name,
    {
      description: uploadMediaTool.description,
      inputSchema: uploadMediaTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await uploadMediaTool.handler(
        args as z.infer<typeof uploadMediaTool.inputSchema>,
        client,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_get_app_info
  server.registerTool(
    getAppInfoTool.name,
    {
      description: getAppInfoTool.description,
      inputSchema: getAppInfoTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await getAppInfoTool.handler(
        args as z.infer<typeof getAppInfoTool.inputSchema>,
        client,
        config,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_execute_app
  server.registerTool(
    executeAppTool.name,
    {
      description: executeAppTool.description,
      inputSchema: executeAppTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await executeAppTool.handler(
        args as z.infer<typeof executeAppTool.inputSchema>,
        client,
        config,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_query_task
  server.registerTool(
    queryTaskTool.name,
    {
      description: queryTaskTool.description,
      inputSchema: queryTaskTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await queryTaskTool.handler(
        args as z.infer<typeof queryTaskTool.inputSchema>,
        client,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_add_app
  server.registerTool(
    addAppTool.name,
    {
      description: addAppTool.description,
      inputSchema: addAppTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await addAppTool.handler(
        args as z.infer<typeof addAppTool.inputSchema>,
        client,
        CONFIG_PATH,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_remove_app
  server.registerTool(
    removeAppTool.name,
    {
      description: removeAppTool.description,
      inputSchema: removeAppTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await removeAppTool.handler(
        args as z.infer<typeof removeAppTool.inputSchema>,
        CONFIG_PATH,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_update_rules
  server.registerTool(
    updateRulesTool.name,
    {
      description: updateRulesTool.description,
      inputSchema: updateRulesTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await updateRulesTool.handler(
        args as z.infer<typeof updateRulesTool.inputSchema>,
        config,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_list_rules
  server.registerTool(
    listRulesTool.name,
    {
      description: listRulesTool.description,
      inputSchema: listRulesTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await listRulesTool.handler(
        args as z.infer<typeof listRulesTool.inputSchema>,
        config,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // rh_validate_config
  server.registerTool(
    validateConfigTool.name,
    {
      description: validateConfigTool.description,
      inputSchema: validateConfigTool.inputSchema.shape,
    },
    async (args, _extra) => {
      const result = await validateConfigTool.handler(
        args as z.infer<typeof validateConfigTool.inputSchema>,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // 6. 注册所有资源
  // rh://apps - APP列表
  server.resource(
    "rh_apps_list",
    "rh://apps",
    { description: "列出所有配置的APP", mimeType: "application/json" },
    async (uri: URL) => {
      const apps = Object.entries(config.apps || {}).map(([alias, app]) => ({
        alias,
        appId: app.appId,
        category: app.category,
        description: app.description,
      }));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ apps }),
          },
        ],
      };
    },
  );

  // rh://apps/{alias} - APP详情
  server.resource(
    "rh_app_detail",
    new ResourceTemplate("rh://apps/{alias}", { list: undefined }),
    { description: "查看指定APP的详细配置", mimeType: "application/json" },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      const alias =
        typeof variables.alias === "string"
          ? variables.alias
          : variables.alias?.[0];
      if (!alias) throw new Error("缺少 alias 参数");

      const app = config.apps[alias];
      if (!app) throw new Error(`APP "${alias}" 不存在`);

      const result = await client.getAppInfo(app.appId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              ...app,
              nodeInfoList: result.data?.nodeInfoList,
            }),
          },
        ],
      };
    },
  );

  // rh://tasks/{taskId} - 任务状态
  server.resource(
    "rh_task_status",
    new ResourceTemplate("rh://tasks/{taskId}", { list: undefined }),
    { description: "查询指定任务的状态和结果", mimeType: "application/json" },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      const taskId =
        typeof variables.taskId === "string"
          ? variables.taskId
          : variables.taskId?.[0];
      if (!taskId) throw new Error("缺少 taskId 参数");

      const result = await client.queryTask(taskId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );

  // rh://tasks/history - 任务历史
  server.resource(
    "rh_tasks_history",
    "rh://tasks/history",
    { description: "最近执行的任务历史", mimeType: "application/json" },
    async (uri: URL) => {
      // 简化实现：返回空历史
      const history = { tasks: [] };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(history),
          },
        ],
      };
    },
  );

  // rh://rules - 模型规则列表
  server.resource(
    "rh_rules_list",
    "rh://rules",
    { description: "列出所有可用的模型规则", mimeType: "application/json" },
    async (uri: URL) => {
      // 简化实现：返回空规则列表
      const rules = { rules: [] };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(rules),
          },
        ],
      };
    },
  );

  // rh://config - 当前配置
  server.resource(
    "rh_config",
    "rh://config",
    {
      description: "查看当前MCP服务配置（隐藏敏感信息）",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      const safeConfig = { ...config } as Record<string, unknown>;
      if (safeConfig.apiKey) {
        safeConfig.apiKey = `${(config.apiKey as string).slice(0, 4)}***`;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(safeConfig),
          },
        ],
      };
    },
  );

  // 7. 创建Express应用
  console.log("Starting HTTP server...");
  const app = express();
  app.use(express.json());

  // 8. 会话管理
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    try {
      if (sessionId && transports[sessionId]) {
        // 复用现有会话
        await transports[sessionId].handleRequest(req, res, req.body);
      } else {
        // 创建新会话
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            transports[id] = transport;
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

  // 9. 启动服务器
  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.log("");
    console.log("✅ RunningHub MCP Server started successfully!");
    console.log(`   MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`   Health check: http://localhost:${port}/health`);
    console.log("");
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
