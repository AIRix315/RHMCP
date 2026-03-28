# RunningHub MCP Service Implementation Plan

## TL;DR

> **Quick Summary**: 设计并实现一个MCP服务，封装RunningHub AI应用平台API，提供4个高级工具和3个资源，使用HTTP/SSE传输，TypeScript实现。
> 
> **Deliverables**:
> - MCP HTTP/SSE服务器 (`src/server/http-server.ts`)
> - 4个核心工具 (`rh_get_app_info`, `rh_upload_media`, `rh_run_app`, `rh_query_task`)
> - 3个资源 (`rh://apps/{webappId}`, `rh://tasks/{taskId}`, `rh://tasks/history`)
> - 配置系统 (`runninghub-mcp-config.json`)
> - 任务历史持久化
> 
> **Estimated Effort**: Medium (约15-20个任务)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Config → Types → API Client → Tools → Server → Integration

---

## Context

### Original Request
设计一个特制的MCP服务来封装RunningHub平台API，让AI模型通过MCP协议调用RunningHub AI应用功能。

### Interview Summary
**Key Discussions**:
- **语言**: TypeScript
- **传输**: HTTP/SSE (远程服务)
- **工具形式**: 高级组合工具 (简化使用)
- **执行策略**: 同步等待结果，轮询超时5分钟
- **文件输入**: Base64编码 (跨平台)
- **配置**: 配置文件 `./runninghub-mcp-config.json`
- **历史存储**: 本地文件存储
- **测试策略**: Tests-after (实现后测试)
- **资源功能**: 需要 (3个资源)

**Research Findings**:
- RunningHub API文档已获取，核心端点明确
- MCP SDK使用Zod schema验证，TypeScript实现
- HTTP服务器可用正常日志（不污染协议）
- 项目无现有MCP实现，需从头构建

### Metis Review (Critical Findings - All Resolved)
**Identified Gaps** (已解决):
1. **上传格式**: multipart/form-data (用户确认)
2. **Base URL**: 可配置两个端点 cn/ai (用户确认)
3. **节点类型**: 支持8种类型 (已添加到类型定义)
4. **错误码**: 完整错误处理 (已添加到计划)
5. **速率限制**: 自动重试+指数退避 (用户确认)
6. **Instance类型**: 仅默认实例 (用户确认，简化实现)

---

## Work Objectives

### Core Objective
构建完整的MCP服务，封装RunningHub API，提供：
- 4个高级工具（获取应用信息、上传媒体、执行任务、查询任务）
- 3个资源（应用详情、任务状态、任务历史）
- HTTP/SSE传输层
- 配置系统与历史持久化

### Concrete Deliverables
- `src/server/http-server.ts` - HTTP/SSE MCP服务器
- `src/tools/*.ts` - 4个工具实现
- `src/resources/*.ts` - 3个资源实现
- `src/config/config.ts` - 配置加载与验证
- `src/api/client.ts` - RunningHub API客户端
- `src/types.ts` - TypeScript类型定义
- `runninghub-mcp-config.json` - 配置文件示例
- `README.md` - 使用文档

### Definition of Done
- [ ] 所有4个工具可正常调用RunningHub API
- [ ] 所有3个资源可正常查询
- [ ] HTTP/SSE服务器启动并可接受MCP请求
- [ ] 配置文件正确加载，缺失apiKey时报错
- [ ] 任务历史可持久化和查询
- [ ] 错误码正确处理并有清晰错误消息

### Must Have
- TypeScript实现
- HTTP/SSE传输
- @modelcontextprotocol/sdk 使用
- Zod schema验证
- 配置文件系统
- 任务历史持久化
- 完整错误处理

### Must NOT Have (Guardrails)
- **不添加Prompts功能** - 明确排除
- **不添加资源订阅/更新通知** - 简化实现
- **不添加WebApp管理/创建功能** - 超出范围
- **不添加用户管理系统** - 超出范围
- **不添加console.log到stdout** - HTTP服务器可以正常日志
- **不在配置缺失时静默失败** - 必须报错
- **不使用placeholder URLs或IDs** - 测试必须使用真实数据

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (新项目)
- **Automated tests**: Tests-after (实现后补充)
- **Framework**: Jest/Vitest (待确认)
- **Agent-Executed QA**: 每个任务都有QA Scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl/node REPL) — Send MCP requests, assert responses
- **Server**: Use Bash (curl) — Test HTTP endpoints, session management
- **Config**: Use Bash (node) — Test config loading, validation

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 可并行):
├── Task 1: Project scaffolding + dependencies
├── Task 2: TypeScript types definitions
├── Task 3: Config loader + validation
└── Task 4: RunningHub API client base

Wave 2 (Core Implementation - 依赖Wave 1):
├── Task 5: Upload implementation (multipart/form-data)
├── Task 6: Tool: rh_get_app_info
├── Task 7: Tool: rh_upload_media
├── Task 8: Tool: rh_run_app (with polling)
├── Task 9: Tool: rh_query_task

Wave 3 (Resources & History - 依赖Wave 2):
├── Task 10: Resource: rh://apps/{webappId}
├── Task 11: Resource: rh://tasks/{taskId}
├── Task 12: Resource: rh://tasks/history
├── Task 13: Task history persistence

Wave 4 (Server & Integration - 依赖Wave 3):
├── Task 14: HTTP/SSE server with session management
├── Task 15: Integration tests
└── Task 16: Documentation (README)

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review
├── Task F3: Real manual QA
└── Task F4: Scope fidelity check
```

### Dependency Matrix
- **1-4**: No dependencies (can start immediately)
- **5**: Depends on 2, 4
- **6-9**: Depends on 2, 4, 5
- **10-13**: Depends on 2, 4, 9
- **14**: Depends on 6-13
- **15-16**: Depends on 14

---

## TODOs

> Implementation + Test = ONE Task.
> 每个任务必须包含 QA Scenarios。

### Wave 1: Foundation (4 tasks, 可并行)

- [ ] 1. **Project Scaffolding + Dependencies**

  **What to do**:
  - 创建项目结构：`src/` 目录
  - 初始化 `package.json`：添加 `@modelcontextprotocol/sdk`, `express`, `zod`, `typescript`
  - 配置 `tsconfig.json`：ES2022, strict mode
  - 创建 `.gitignore`
  - 创建配置文件示例 `runninghub-mcp-config.json.example`

  **Must NOT do**:
  - 不要添加不需要的依赖（如web框架、ORM等）
  - 不要配置过于复杂的构建流程

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: Tasks 2-4

  **References**:
  - MCP SDK: `https://github.com/modelcontextprotocol/typescript-sdk` - npm包 `@modelcontextprotocol/sdk`

  **QA Scenarios**:
  ```
  Scenario: Project structure is valid
    Tool: Bash
    Steps:
      1. ls -la src/ → assert directories exist
      2. cat package.json → assert dependencies include @modelcontextprotocol/sdk
      3. npx tsc --noEmit → assert no errors
    Expected Result: All checks pass
    Evidence: .sisyphus/evidence/task-01-scaffold.log
  ```

- [ ] 2. **TypeScript Type Definitions**

  **What to do**:
  - 创建 `src/types.ts`
  - 定义所有接口：`NodeInfo`, `Config`, `TaskOutput`, `TaskStatus`, `ApiError`, `ContentBlock`
  - 支持8种节点类型：IMAGE, AUDIO, VIDEO, STRING, INT, FLOAT, LIST, SWITCH
  - 定义错误码枚举

  **Must NOT do**:
  - 不要添加未使用的类型
  - 不要使用 `any` 类型

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: Tasks 5-9

  **References**:
  - MCP SDK types: `@modelcontextprotocol/sdk` 中的 `CallToolResult`, `ContentBlock`
  - RunningHub API: 文档中的 `nodeInfoList` 结构

  **QA Scenarios**:
  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. npx tsc src/types.ts --noEmit
      2. node -e "import('./src/types.js').then(t => console.log(typeof t.NodeInfo))"
    Expected Result: No compile errors, types exported
    Evidence: .sisyphus/evidence/task-02-types.log
  ```

- [ ] 3. **Config Loader + Validation**

  **What to do**:
  - 创建 `src/config/config.ts`
  - 实现配置加载：从 `./runninghub-mcp-config.json` 读取
  - Zod schema验证配置：apiKey(必需), baseUrl(必需), storagePath, timeout, pollInterval
  - 支持两个baseUrl：`www.runninghub.cn` 和 `www.runninghub.ai`
  - 配置缺失或无效时抛出明确错误

  **Must NOT do**:
  - 不要静默失败
  - 不要硬编码默认apiKey

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: Tasks 5-14

  **References**:
  - Zod docs: `https://zod.dev/` - schema validation patterns

  **QA Scenarios**:
  ```
  Scenario: Config loads successfully
    Tool: Bash
    Steps:
      1. Create valid config file
      2. node -e "import('./src/config/config.js').then(c => c.loadConfig())"
    Expected Result: Config object returned with all fields
    Evidence: .sisyphus/evidence/task-03-config-ok.log

  Scenario: Config fails with missing apiKey
    Tool: Bash
    Steps:
      1. Create config without apiKey
      2. node -e "import('./src/config/config.js').then(c => c.loadConfig())"
    Expected Result: Error thrown with message "apiKey is required"
    Evidence: .sisyphus/evidence/task-03-config-error.log
  ```

- [ ] 4. **RunningHub API Client Base**

  **What to do**:
  - 创建 `src/api/client.ts`
  - 实现HTTP客户端基础类
  - 封装fetch调用：支持GET/POST
  - 实现错误处理：解析API响应中的错误码
  - 实现速率限制重试：指数退避（遇415/421自动重试）
  - 实现multipart/form-data上传辅助函数

  **Must NOT do**:
  - 不要在stdout打印日志（HTTP服务器可以正常日志）
  - 不要忽略错误响应

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: Tasks 5-9

  **References**:
  - RunningHub API: `https://www.runninghub.cn` endpoints
  - Retry pattern: 指数退避算法

  **QA Scenarios**:
  ```
  Scenario: API client initializes
    Tool: Bash
    Steps:
      1. node -e "import('./src/api/client.js').then(a => new a.RunningHubClient(config))"
    Expected Result: Client instance created
    Evidence: .sisyphus/evidence/task-04-client.log
  ```

### Wave 2: Core Implementation (5 tasks, 依赖Wave 1)

- [ ] 5. **Upload Implementation (multipart/form-data)**

  **What to do**:
  - 创建 `src/api/upload.ts`
  - 实现multipart/form-data上传函数
  - 支持IMAGE, AUDIO, VIDEO, input类型
  - 文件大小验证：≤30MB
  - 调用 `https://{baseUrl}/task/openapi/upload`

  **Must NOT do**:
  - 不要上传超过30MB的文件
  - 不要使用JSON body上传（必须用multipart）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - RunningHub upload API: `/task/openapi/upload`

  **QA Scenarios**:
  ```
  Scenario: Upload small image succeeds
    Tool: Bash
    Steps:
      1. node -e "uploadFile(config, './test-image.png', 'image')"
    Expected Result: fileName returned (api/xxx.png)
    Evidence: .sisyphus/evidence/task-05-upload-ok.log

  Scenario: Upload >30MB file fails
    Tool: Bash
    Steps:
      1. node -e "uploadFile(config, './large-file.mp4', 'video')"
    Expected Result: Error "File too large (max 30MB)"
    Evidence: .sisyphus/evidence/task-05-upload-size-error.log
  ```

- [ ] 6. **Tool: rh_get_app_info**

  **What to do**:
  - 创建 `src/tools/get-app-info.ts`
  - 注册MCP工具：`rh_get_app_info`
  - Zod inputSchema: `{ webappId: string }`
  - 调用 `/api/webapp/apiCallDemo?apiKey={key}&webappId={id}`
  - 返回 nodeInfoList + covers

  **Must NOT do**:
  - 不要缓存响应（每次都是最新配置）
  - 不要隐藏错误码

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - MCP tool registration: `server.registerTool()`
  - RunningHub API: `/api/webapp/apiCallDemo`

  **QA Scenarios**:
  ```
  Scenario: Get app info succeeds
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"tools/call","params":{"name":"rh_get_app_info","arguments":{"webappId":"..."}}}'
    Expected Result: JSON with nodeInfoList
    Evidence: .sisyphus/evidence/task-06-get-app-info.log
  ```

- [ ] 7. **Tool: rh_upload_media**

  **What to do**:
  - 创建 `src/tools/upload-media.ts`
  - 注册MCP工具：`rh_upload_media`
  - Zod inputSchema: `{ filePath: string, fileType: enum }`
  - 调用upload函数（multipart/form-data）
  - 返回 fileName (服务器路径)

  **Must NOT do**:
  - 不要在工具中直接读取文件（应该通过filePath）
  - 不要返回原始响应，只返回fileName

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Tasks 2, 4, 5

  **References**:
  - MCP tool registration: `server.registerTool()`
  - Upload implementation: `src/api/upload.ts`

  **QA Scenarios**:
  ```
  Scenario: Upload media succeeds
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"tools/call","params":{"name":"rh_upload_media","arguments":{"filePath":"./test.png","fileType":"image"}}}'
    Expected Result: fileName returned
    Evidence: .sisyphus/evidence/task-07-upload-media.log
  ```

- [ ] 8. **Tool: rh_run_app (with polling + retry)**

  **What to do**:
  - 创建 `src/tools/run-app.ts`
  - 注册MCP工具：`rh_run_app`
  - Zod inputSchema: `{ webappId: string, nodeInfoList: array }`
  - 调用 `/task/openapi/ai-app/run` 提交任务
  - 实现轮询：调用 `/task/openapi/outputs` 直到成功或超时
  - 实现速率限制重试：遇415/421自动重试
  - 超时：5分钟（300秒），轮询间隔：5秒
  - 返回 fileUrl列表

  **Must NOT do**:
  - 不要无限轮询（必须超时）
  - 不要隐藏任务失败原因

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - RunningHub API: `/task/openapi/ai-app/run`, `/task/openapi/outputs`
  - Status codes: 0(成功), 804(运行中), 805(失败), 813(排队)

  **QA Scenarios**:
  ```
  Scenario: Run app succeeds
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"tools/call","params":{"name":"rh_run_app","arguments":{"webappId":"...","nodeInfoList":[...]}}}'
      2. Wait for response
    Expected Result: fileUrl array returned
    Evidence: .sisyphus/evidence/task-08-run-app-ok.log

  Scenario: Run app timeout
    Tool: Bash
    Steps:
      1. Submit long-running task
      2. Wait >300 seconds
    Expected Result: Error "Task timeout"
    Evidence: .sisyphus/evidence/task-08-run-app-timeout.log
  ```

- [ ] 9. **Tool: rh_query_task**

  **What to do**:
  - 创建 `src/tools/query-task.ts`
  - 注册MCP工具：`rh_query_task`
  - Zod inputSchema: `{ taskId: string }`
  - 调用 `/task/openapi/outputs`
  - 返回任务状态 + 结果文件列表

  **Must NOT do**:
  - 不要自动轮询（仅查询一次）
  - 不要隐藏失败原因

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - RunningHub API: `/task/openapi/outputs`

  **QA Scenarios**:
  ```
  Scenario: Query running task
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"tools/call","params":{"name":"rh_query_task","arguments":{"taskId":"..."}}}'
    Expected Result: Status + optional fileUrl
    Evidence: .sisyphus/evidence/task-09-query-task.log
  ```

### Wave 3: Resources & History (4 tasks, 依赖Wave 2)

- [ ] 10. **Resource: rh://apps/{webappId}**

  **What to do**:
  - 创建 `src/resources/apps.ts`
  - 使用 `ResourceTemplate` 注册动态资源模板
  - URI模板: `rh://apps/{webappId}`
  - 调用 `/api/webapp/apiCallDemo` 获取应用详情
  - 返回JSON格式的应用信息

  **Must NOT do**:
  - 不要实现订阅/更新通知（已排除）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - MCP ResourceTemplate: `new ResourceTemplate('rh://apps/{webappId}', {...})`

  **QA Scenarios**:
  ```
  Scenario: Access app resource
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"resources/read","params":{"uri":"rh://apps/..."}}'
    Expected Result: JSON app info
    Evidence: .sisyphus/evidence/task-10-resource-apps.log
  ```

- [ ] 11. **Resource: rh://tasks/{taskId}**

  **What to do**:
  - 创建 `src/resources/tasks.ts`
  - 使用 `ResourceTemplate` 注册动态资源模板
  - URI模板: `rh://tasks/{taskId}`
  - 调用 `/task/openapi/outputs` 获取任务状态
  - 返回JSON格式的任务信息

  **Must NOT do**:
  - 不要实现订阅/更新通知（已排除）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocked By**: Tasks 2, 4, 9

  **References**:
  - MCP ResourceTemplate: `new ResourceTemplate('rh://tasks/{taskId}', {...})`

  **QA Scenarios**:
  ```
  Scenario: Access task resource
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"resources/read","params":{"uri":"rh://tasks/..."}}'
    Expected Result: JSON task status
    Evidence: .sisyphus/evidence/task-11-resource-tasks.log
  ```

- [ ] 12. **Resource: rh://tasks/history**

  **What to do**:
  - 创建 `src/resources/history.ts`
  - 注册静态资源：`rh://tasks/history`
  - 从本地文件读取任务历史：`{storagePath}/history.json`
  - 返回最近执行的任务列表

  **Must NOT do**:
  - 不要返回无限历史（限制最近N条）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocked By**: Task 13

  **References**:
  - MCP static resource: `server.registerResource()`

  **QA Scenarios**:
  ```
  Scenario: Access history resource
    Tool: Bash
    Steps:
      1. curl -X POST http://localhost:3000/mcp -d '{"method":"resources/read","params":{"uri":"rh://tasks/history"}}'
    Expected Result: JSON array of recent tasks
    Evidence: .sisyphus/evidence/task-12-resource-history.log
  ```

- [ ] 13. **Task History Persistence**

  **What to do**:
  - 创建 `src/history/store.ts`
  - 实现历史记录存储：每次任务完成后写入
  - 存储位置：`{storagePath}/history.json`
  - 存储内容：taskId, webappId, status, timestamps, result
  - 限制历史条数（如最近100条）

  **Must NOT do**:
  - 不要阻塞主流程（异步写入）
  - 不要存储敏感信息（apiKey等）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocked By**: Tasks 3

  **References**:
  - Node.js fs: 文件读写

  **QA Scenarios**:
  ```
  Scenario: History persisted after task
    Tool: Bash
    Steps:
      1. Run a task
      2. cat {storagePath}/history.json
    Expected Result: New entry in history file
    Evidence: .sisyphus/evidence/task-13-history-persist.log
  ```

### Wave 4: Server & Integration (3 tasks, 依赖Wave 3)

- [ ] 14. **HTTP/SSE Server with Session Management**

  **What to do**:
  - 创建 `src/server/http-server.ts`
  - 使用 Express 创建HTTP服务器
  - 使用 `NodeStreamableHTTPServerTransport` 实现MCP传输
  - 端点：`POST /mcp`
  - 会话管理：`sessionIdGenerator`, `onsessioninitialized`, `onclose`
  - 注册所有工具和资源
  - 启动时加载配置

  **Must NOT do**:
  - 不要污染stdout（HTTP服务器可以正常日志）
  - 不要硬编码端口号（应可配置）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Final integration)
  - **Blocked By**: Tasks 6-13

  **References**:
  - MCP HTTP transport: `NodeStreamableHTTPServerTransport`
  - Express: `https://expressjs.com/`

  **QA Scenarios**:
  ```
  Scenario: Server starts and accepts MCP requests
    Tool: Bash
    Steps:
      1. npm run start
      2. curl -X POST http://localhost:3000/mcp -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18"},"id":1}'
    Expected Result: Server responds with capabilities
    Evidence: .sisyphus/evidence/task-14-server-start.log

  Scenario: Session management works
    Tool: Bash
    Steps:
      1. Send initialize request → get sessionId
      2. Send subsequent request with sessionId header
    Expected Result: Session reused, no new server created
    Evidence: .sisyphus/evidence/task-14-session.log
  ```

- [ ] 15. **Integration Tests**

  **What to do**:
  - 创建 `src/__tests__/integration.test.ts`
  - 测试完整流程：获取应用 → 上传文件 → 执行任务 → 查询结果
  - 测试错误处理：无效apiKey、文件过大、超时
  - 测试会话管理

  **Must NOT do**:
  - 不要使用placeholder数据（需真实apiKey和webappId）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 14

  **References**:
  - Jest/Vitest: 测试框架

  **QA Scenarios**:
  ```
  Scenario: Full workflow test
    Tool: Bash
    Steps:
      1. npm test
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-15-integration-tests.log
  ```

- [ ] 16. **Documentation (README)**

  **What to do**:
  - 创建 `README.md`
  - 项目介绍、功能说明
  - 配置文件说明和示例
  - 工具和资源使用说明
  - 启动和测试命令
  - API错误码参考

  **Must NOT do**:
  - 不要添加过多无关内容
  - 不要遗漏错误处理说明

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15)
  - **Blocked By**: Task 14

  **References**:
  - 无

  **QA Scenarios**:
  ```
  Scenario: README is complete
    Tool: Bash
    Steps:
      1. grep "rh_get_app_info" README.md
      2. grep "configuration" README.md
    Expected Result: All sections present
    Evidence: .sisyphus/evidence/task-16-readme.log
  ```

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — oracle
- [ ] F2. **Code Quality Review** — unspecified-high
- [ ] F3. **Real Manual QA** — unspecified-high
- [ ] F4. **Scope Fidelity Check** — deep

---

## Commit Strategy

Atomic commits per module:
1. `init: project setup`
2. `types: add TypeScript interfaces`
3. `config: add config loader`
4. `api: add RunningHub client`
5. `upload: add multipart upload`
6. `tools: add rh_get_app_info`
7. `tools: add rh_upload_media`
8. `tools: add rh_run_app`
9. `tools: add rh_query_task`
10. `resources: add rh://apps`
11. `resources: add rh://tasks`
12. `resources: add rh://history`
13. `history: add persistence`
14. `server: add HTTP/SSE server`
15. `docs: add README`

---

## Success Criteria

### Verification Commands
```bash
# Start server
npm run start

# Test MCP request
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18"},"id":1}'
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Server starts without errors
- [ ] All tools callable
- [ ] All resources accessible
- [ ] Config validates correctly