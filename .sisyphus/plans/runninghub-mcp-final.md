# RunningHub MCP Service - 工作计划

## TL;DR

> **目标**: 构建一个MCP服务，让Agent能够调用RunningHub平台的生图、生视频、改图、生成音乐等功能
>
> **分发方式**: GitHub托管，Agent自行部署，用户仅需配置API Key和APP ID
>
> **工具数量**: 8个工具
>
> **资源数量**: 5个资源
>
> **核心设计原则**: 
> - **工具+配置文件双重支持**：Agent可用工具操作，也可直接编辑配置
> - **自动+手动更新**：启动时自动更新规则，也可手动触发
> - **配置验证**：提供标准检验，确保配置正确
> - **让Agent便利，用户才能便利**

---

## Context

### 用户需求
1. Agent通过MCP调用RunningHub AI应用功能
2. 用户在RH网站设计ComfyUI工作流 → 封装成APP → 获得APP ID
3. Agent只需配置API Key + APP ID即可使用
4. 模型规则从GitHub导入，社区可维护

### 技术栈
- **语言**: TypeScript
- **协议**: MCP (Model Context Protocol)
- **传输**: HTTP/SSE
- **SDK**: @modelcontextprotocol/sdk

### 测试验证
- API Key: `13f84abb028e4503bd82507d68e22715`
- APP ID: `2037760725296357377`
- 端点: `https://www.runninghub.ai/`
- 结果: ✅ 全部可用

---

## Work Objectives

### Must Have
- [ ] 8个MCP工具（APP/规则双管理）
- [ ] 5个MCP资源（apps, tasks, history, rules, config）
- [ ] 配置文件系统 + 配置验证
- [ ] GitHub模型规则导入（启动自动更新）
- [ ] 分层重试策略（全局 + APP级覆盖）
- [ ] 存储配置（本地/云盘，启动时确定）
- [ ] 参数约束验证
- [ ] 连续工作流支持

### Must NOT Have
- 用户管理系统
- 直接调用工作流
- Prompts功能
- 资源订阅通知
- 结果文件缓存（仅任务状态记录）
- 直接读取媒体内容（避免Token消耗）

---

## Execution Strategy

### Wave 1: 基础设施 (4 tasks)
```
Task 1: 项目初始化 + GitHub仓库结构
Task 2: TypeScript类型定义
Task 3: 配置管理（支持API Key验证）
Task 4: RunningHub API客户端
```

### Wave 2: 核心工具 (6 tasks)
```
Task 5:  rh_upload_media - 上传媒体
Task 6:  rh_get_app_info - 获取APP配置
Task 7:  rh_execute_app - 执行APP（含验证）
Task 8:  rh_query_task - 查询任务
Task 9:  rh_add_app - 注册APP
Task 10: rh_remove_app - 删除APP
```

### Wave 3: 规则与资源 (5 tasks)
```
Task 11: rh_update_rules - 更新模型规则（启动自动+手动）
Task 12: rh_list_rules - 列出规则
Task 13: MCP资源实现 (6个)
Task 14: 配置验证工具
Task 15: 参数约束验证器
```

### Wave 4: 服务与文档 (3 tasks)
```
Task 16: HTTP/SSE MCP服务器
Task 17: 一键部署脚本
Task 18: README文档
```

---

## TODOs

### Wave 1: 基础设施

- [ ] 1. **项目初始化**

  **What to do**:
  - 创建GitHub仓库结构
  - 初始化package.json (TypeScript, MCP SDK, Express, Zod)
  - 配置tsconfig.json
  - 创建.gitignore
  - 创建配置示例文件

  **Recommended Agent**: `quick`

  **QA**:
  ```
  npm install → 成功
  npx tsc --noEmit → 无错误
  ```

- [ ] 2. **TypeScript类型定义**

  **What to do**:
  - 创建 `src/types.ts`
  - 定义: Config, AppInfo, NodeInfo, TaskOutput, ModelRule
  - 支持8种节点类型

  **Recommended Agent**: `quick`

- [ ] 3. **配置管理**

  **What to do**:
  - 创建 `src/config/`
  - 加载 `runninghub-mcp-config.json`
  - 验证必填项 (apiKey)
  - 支持环境变量覆盖

  **Recommended Agent**: `quick`

- [ ] 4. **RunningHub API客户端**

  **What to do**:
  - 创建 `src/api/client.ts`
  - 实现GET/POST封装
  - 错误码处理
  - 并发控制

  **Recommended Agent**: `unspecified-high`

---

### Wave 2: 核心工具

- [ ] 5. **rh_upload_media**

  **What to do**:
  - multipart/form-data上传
  - 文件大小验证 (≤30MB)
  - 支持image/audio/video类型

  **Recommended Agent**: `quick`

- [ ] 6. **rh_get_app_info**

  **What to do**:
  - 调用 `/api/webapp/apiCallDemo`
  - 返回APP配置 + 关联的模型规则
  - 支持别名查询

  **Recommended Agent**: `quick`

- [ ] 7. **rh_execute_app**

  **What to do**:
  - 参数验证（使用模型规则）
  - 同步/异步两种模式
  - 轮询等待结果
  - 支持连续工作流

  **Recommended Agent**: `deep`

- [ ] 8. **rh_query_task**

  **What to do**:
  - 调用 `/task/openapi/outputs`
  - 返回任务状态和结果

  **Recommended Agent**: `quick`

- [ ] 9. **rh_add_app**

  **What to do**:
  - 调用API获取nodeInfoList
  - 自动导入模型规则
  - 保存到配置

  **Recommended Agent**: `quick`

- [ ] 10. **rh_remove_app**

  **What to do**:
  - 从配置删除APP
  - 支持别名删除

  **Recommended Agent**: `quick`

---

### Wave 3: 规则与资源

- [ ] 11. **rh_update_rules**

  **What to do**:
  - 从GitHub下载规则
  - 本地缓存
  - 支持增量更新

  **Recommended Agent**: `quick`

- [ ] 12. **rh_list_rules**

  **What to do**:
  - 列出所有可用模型规则
  - 显示版本信息

  **Recommended Agent**: `quick`

- [ ] 13. **MCP资源实现**

  **What to do**:
  - `rh://apps` - APP列表
  - `rh://apps/{alias}` - APP详情
  - `rh://tasks/{taskId}` - 任务状态
  - `rh://tasks/history` - 任务历史
  - `rh://rules` - 模型规则列表
  - `rh://config` - 当前配置

  **Recommended Agent**: `quick`

- [ ] 14. **配置验证工具**

  **What to do**:
  - 验证配置文件格式
  - 检查必填项
  - 检查APP配置完整性
  - 返回错误详情

  **Recommended Agent**: `quick`

- [ ] 15. **参数约束验证器**

  **What to do**:
  - 合并服务级+模型级+APP级约束
  - 验证参数范围
  - 返回错误提示

  **Recommended Agent**: `quick`

---

### Wave 4: 服务与文档

- [ ] 15. **HTTP/SSE MCP服务器**

  **What to do**:
  - Express HTTP服务器
  - NodeStreamableHTTPServerTransport
  - 会话管理
  - 注册所有工具和资源

  **Recommended Agent**: `unspecified-high`

- [ ] 16. **一键部署脚本**

  **What to do**:
  - `scripts/setup.sh`
  - 安装依赖
  - 下载模型规则
  - 生成配置模板

  **Recommended Agent**: `quick`

- [ ] 17. **README文档**

  **What to do**:
  - 项目介绍
  - 快速开始（3步配置）
  - 工具说明
  - 模型规则贡献指南

  **Recommended Agent**: `writing`

---

## Commit Strategy

```
1. init: project setup
2. types: core interfaces
3. config: configuration management + validation
4. api: RH client
5. tools: upload, get-info, execute, query
6. tools: add-app, remove-app
7. rules: update, list + auto-update on startup
8. resources: apps, tasks, history, rules, config
9. validator: parameter constraints
10. server: HTTP/SSE
11. scripts: deployment
12. docs: README
```

---

## Success Criteria

- [ ] Agent可从GitHub克隆并部署
- [ ] 用户仅需配置API Key + APP ID
- [ ] 8个工具全部可用
- [ ] 6个资源全部可查询
- [ ] 启动时自动更新模型规则
- [ ] 参数验证生效
- [ ] 分层重试策略可用
- [ ] 连续工作流可用
- [ ] 配置验证工具可用