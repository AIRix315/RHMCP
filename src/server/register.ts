/**
 * MCP Server 注册工具和资源
 * 为 STDIO 和 HTTP 模式提供统一的注册逻辑
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RunningHubConfig } from "../types.js";
import type { RunningHubClient } from "../api/client.js";

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

export interface ServerContext {
  server: McpServer;
  client: RunningHubClient;
  config: RunningHubConfig;
  configPath: string;
}

/**
 * 注册所有工具到 MCP 服务器
 */
export function registerTools(ctx: ServerContext): void {
  const { server, client, config, configPath } = ctx;

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
        configPath,
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
        configPath,
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
}

/**
 * 注册所有资源到 MCP 服务器
 */
export function registerResources(ctx: ServerContext): void {
  const { server, client, config } = ctx;

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
}

/**
 * 创建并配置 MCP 服务器
 */
export function createServer(): McpServer {
  return new McpServer(
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
}