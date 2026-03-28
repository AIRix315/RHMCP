# 安装问题记录

本文档记录了 RHMCP 项目在 OpenCode 集成测试过程中遇到的问题及解决方案。

---

## 问题 1: `npm link` 后命令不可用

### 问题描述

执行 `npm link` 后，显示安装成功，但 `runninghub-mcp` 命令提示找不到。

```bash
$ npm link
added 1 package in 7s

$ runninghub-mcp
bash: runninghub-mcp: command not found
```

### 根本原因

`package.json` 缺少 `bin` 字段。npm link 创建符号链接，但如果没有指定 `bin` 入口，npm 不知道哪个文件应该作为全局命令。

### 解决方案

在 `package.json` 中添加 `bin` 字段：

```json
{
  "name": "runninghub-mcp",
  "bin": {
    "runninghub-mcp": "./dist/server/index.js"
  }
}
```

同时，入口文件需要添加 shebang：

```typescript
#!/usr/bin/env node
// src/server/index.ts
```

### 验证

```bash
$ npm link
$ which runninghub-mcp
/d/Program Files/nodejs/node_global/runninghub-mcp

$ runninghub-mcp --help
RunningHub MCP Server v1.0.0
...
```

---

## 问题 2: OpenCode 需要使用 STDIO 模式

### 问题描述

原始实现使用 HTTP 模式（`StreamableHTTPServerTransport`），但 OpenCode 的 MCP 配置使用 STDIO 模式（通过 `command` 启动本地进程）。

### 根本原因

MCP 协议支持多种传输方式：
- **STDIO**: 通过 `stdin/stdout` 通信，适用于本地进程集成
- **HTTP**: 通过 HTTP API 通信，适用于远程服务和云部署

OpenCode 的 MCP 配置格式：

```json
{
  "mcp": {
    "server-name": {
      "type": "local",
      "command": ["命令", "参数"],
      "env": { "环境变量": "值" }
    }
  }
}
```

这是一个 STDIO 模式的配置，因为 OpenCode 会启动子进程并通过 stdin/stdout 与其通信。

### 解决方案

实现双模式支持：

1. 创建独立的传输模块：
   - `src/server/stdio.ts` - STDIO 模式入口
   - `src/server/http.ts` - HTTP 模式入口
   - `src/server/register.ts` - 工具和资源注册（共享）

2. 添加模式检测逻辑：

```typescript
// src/server/main.ts
function detectTransportMode(): "stdio" | "http" {
  if (process.argv.includes("--stdio")) return "stdio";
  if (process.env.MCP_TRANSPORT === "stdio") return "stdio";
  return "http"; // 默认
}
```

3. STDIO 模式关键点：

```typescript
// 使用 console.error 输出日志，避免污染 stdout
console.error("Loading configuration...");

// 使用 StdioServerTransport
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 配置示例

**STDIO 模式（OpenCode 集成）**:

```json
{
  "mcp": {
    "runninghub": {
      "type": "local",
      "command": ["runninghub-mcp", "--stdio"],
      "env": {
        "CONFIG_PATH": "/path/to/runninghub-mcp-config.json"
      }
    }
  }
}
```

**HTTP 模式（云部署）**:

```json
{
  "mcp": {
    "runninghub": {
      "type": "http",
      "url": "https://your-server.com/mcp"
    }
  }
}
```

---

## 问题 3: Windows 路径问题

### 问题描述

在 Windows 环境下，OpenCode 配置中的路径需要使用转义的 Windows 路径或使用 `/` 分隔符。

### 解决方案

**方式一：使用转义的反斜杠**

```json
{
  "env": {
    "CONFIG_PATH": "E:\\Projects\\RHMCP\\runninghub-mcp-config.json"
  }
}
```

**方式二：使用正斜杠（Node.js 支持）**

```json
{
  "env": {
    "CONFIG_PATH": "E:/Projects/RHMCP/runninghub-mcp-config.json"
  }
}
```

---

## 问题 4: 测试 STDIO 模式

### 问题描述

如何验证 STDIO 模式是否正常工作？

### 解决方案

使用 JSON-RPC 请求测试：

```bash
# 测试初始化
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | runninghub-mcp --stdio

# 应该返回类似：
# {"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true},...},"serverInfo":{"name":"runninghub-mcp","version":"1.0.0"}},"jsonrpc":"2.0","id":1}

# 测试工具列表
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | runninghub-mcp --stdio
```

---

## 检查清单

在集成 MCP 服务时，确保：

- [ ] `package.json` 包含 `bin` 字段
- [ ] 入口文件有 `#!/usr/bin/env node` shebang
- [ ] 执行 `npm run build` 构建最新代码
- [ ] 执行 `npm link` 全局链接
- [ ] 验证命令可用：`runninghub-mcp --help`
- [ ] 验证 STDIO 模式：`echo '...' | runninghub-mcp --stdio`
- [ ] 配置文件使用正确的绝对路径
- [ ] 配置正确的 `CONFIG_PATH` 环境变量

---

## 参考链接

- [MCP SDK 官方文档](https://github.com/modelcontextprotocol/typescript-sdk)
- [OpenCode MCP 配置](https://github.com/sst/opencode)
- [StdioServerTransport 实现](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/stdio.ts)