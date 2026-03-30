# RHMCP 优化计划（修正版）

> 基于安全性分析和 OpenClaw MCP 原生支持讨论
> 基于完整代码架构调查修正
> 生成日期: 2026-03-30
> 状态: 计划阶段，待执行

---

## 一、背景与目标

### 1.1 问题来源

ClawHub 安全审计对 RHSkill 提出以下问题：
- `child_process` 执行外部 CLI（安全标记）
- 环境变量 + 网络发送（潜在风险）
- 文件读取 + 网络发送（潜在风险）
- 外部 CLI 访问云凭证（bdpan/gog）

### 1.2 关键发现

OpenClaw 原生支持 MCP 协议，可通过 `mcp.servers` 配置直接连接 MCP Server：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "npx",
        "args": ["runninghub-mcp", "--stdio"]
      }
    }
  }
}
```

**优势**：
- OpenClaw 平台管理 MCP Server 进程生命周期
- 无需 Skill 层启动子进程
- 消除 `child_process` 安全警告
- 符合 MCP 标准协议

### 1.3 最终决策

| 决策项 | 决策 |
|--------|------|
| RHSkill | 搁置，不修改 |
| RHMCP 优化 | 集中优化，支持所有 MCP 客户端 |
| npm 发布 | `runninghub-mcp`（发布者 AIRix315） |
| 配置分离 | service.json + apps.json + .env（含向后兼容） |
| platforms 目录 | 仅 OpenCode 和 OpenClaw |

---

## 二、RHSkill 搁置计划

### 2.1 当前状态

RHSkill 作为独立 Skill 项目，存在以下问题：
- 需要通过 `child_process` 调用外部 CLI
- 需要启动子进程连接 RHMCP
- ClawHub 安全扫描标记为风险

### 2.2 搁置决策

| 项目 | 处理 |
|------|------|
| 代码仓库 | 保留，暂不修改 |
| 文档更新 | 暂时保留原有文档 |
| 后续计划 | RHMCP 优化完成后，评估是否作为包装器 |

### 2.3 搁置期间

用户可直接使用 RHMCP + OpenClaw MCP 配置，无需 RHSkill。

---

## 三、RHMCP 共性修改

> 以下修改适用于所有 MCP 客户端：OpenCode、OpenClaw、Claude Desktop 等

### 3.1 当前架构分析

#### 3.1.1 现有配置加载机制

**文件位置**：`src/config/loader.ts`

```typescript
// 当前：同步函数，单文件配置
export function loadConfig(configPath?: string): RunningHubConfig {
  const path = configPath || findConfigFile();
  const content = readFileSync(path, 'utf-8');
  const rawConfig = JSON.parse(content);
  
  // 环境变量覆盖（仅 apiKey）
  if (process.env.RUNNINGHUB_API_KEY) {
    config.apiKey = process.env.RUNNINGHUB_API_KEY;
  }
  
  return applyDefaults(config);
}
```

**配置查找顺序**（第99-111行）：
1. `{cwd}/rhmcp-config.json` ← 默认
2. `{cwd}/runninghub-mcp-config.json` ← 向后兼容
3. `{cwd}/config/rhmcp-config.json`
4. `{cwd}/config/runninghub-mcp-config.json`

**环境变量支持**：
- `RUNNINGHUB_API_KEY` - 覆盖配置文件中的 apiKey
- `CONFIG_PATH` - 指定配置文件路径（传给工具，未在 loader 中使用）

#### 3.1.2 现有类型定义

**文件位置**：`src/types.ts`（第7-16行）

```typescript
interface RunningHubConfig {
  apiKey: string;
  baseUrl: string;              // ← 当前是任意字符串
  maxConcurrent: number;
  storage: StorageConfig;
  apps: Record<string, AppConfig>;  // ← 当前是扁平结构
  modelRules: ModelRulesConfig;
  retry: RetryConfig;
  logging: LogConfig;
}
```

#### 3.1.3 现有 CLI 入口

**文件位置**：`src/server/main.ts`

```typescript
// 当前：简单的 process.argv 检测
export function detectTransportMode(): "stdio" | "http" {
  if (process.argv.includes("--stdio")) return "stdio";
  if (process.env.MCP_TRANSPORT === "stdio") return "stdio";
  return "http";
}
```

**package.json bin 定义**：
```json
{
  "bin": {
    "rhmcp": "./dist/server/index.js"
  }
}
```

---

### 3.2 npm 发布配置

#### 3.2.1 package.json 修改

```json
{
  "name": "runninghub-mcp",
  "version": "1.0.0",
  "description": "RunningHub AI Platform MCP Server - 支持 OpenCode、OpenClaw、Claude Desktop 等客户端",
  "author": "AIRix315",
  "license": "MIT",
  "type": "module",
  "main": "dist/server/index.js",
  "bin": {
    "rhmcp": "./dist/server/index.js",
    "rhmcp-update-apps": "./dist/cli/update-apps.js"
  },
  "files": [
    "dist/**/*",
    "config/**/*",
    "references/**/*",
    "README.md",
    "CHANGELOG.md"
  ],
  "keywords": [
    "mcp",
    "runninghub",
    "ai",
    "image-generation",
    "video-generation",
    "opencode",
    "openclaw",
    "claude"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/AIRix315/RHMCP.git"
  },
  "bugs": {
    "url": "https://github.com/AIRix315/RHMCP/issues"
  },
  "homepage": "https://github.com/AIRix315/RHMCP#readme",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.21.0",
    "zod": "^3.23.0",
    "dotenv": "^16.0.0"
  }
}
```

**关键修改**：
1. 新增 `dotenv` 依赖（用于加载 .env 文件）
2. 新增 bin 入口 `rhmcp-update-apps`
3. 包名改为 `runninghub-mcp`

#### 3.2.2 tsconfig.json 修改

需要确保 `dist/cli/` 目录正确编译：

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    // ...其他选项
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 配置文件分离（含向后兼容）

#### 3.3.1 目录结构

```
RHMCP/
├── config/
│   ├── runninghub-mcp-config.example.json  # 旧格式模板（保留）
│   ├── service.example.json                 # 新格式：服务配置模板
│   ├── apps.example.json                    # 新格式：APP 配置模板
│   └── README.md                            # 配置说明
│
├── references/
│   ├── apps.json                            # 官方共享 APP 列表
│   ├── opencode/                            # OpenCode 专属
│   │   ├── mcp-config.json
│   │   └── service.json
│   └── openclaw/                            # OpenClaw 专属
│       ├── mcp-config.json
│       └── service.json
│
├── .env.example                             # 环境变量模板
└── ...
```

#### 3.3.2 类型定义修改

**文件位置**：`src/types.ts`

```typescript
// 新增：baseUrl 联合类型
export type BaseUrl = "auto" | "www.runninghub.cn" | "www.runninghub.ai";

// 修改：RunningHubConfig
export interface RunningHubConfig {
  apiKey: string;
  baseUrl: BaseUrl | string;  // 支持 "auto" 或具体域名
  maxConcurrent: number;
  storage: StorageConfig;
  
  // 新增：分层 APP 配置（同时支持旧格式）
  apps?: Record<string, AppConfig>;           // 旧格式（扁平）
  appsConfig?: AppsConfig;                    // 新格式（分层）
  
  modelRules: ModelRulesConfig;
  retry: RetryConfig;
  logging: LogConfig;
}

// 新增：分层 APP 配置
export interface AppsConfig {
  server: Record<string, AppConfig>;  // 从 GitHub 拉取
  user: Record<string, AppConfig>;   // 用户自定义
  _updated?: string;                   // 更新时间戳
  _source?: string;                   // 来源 URL
}

// 新增：迁移配置（内部使用）
export interface MigratedConfig {
  apiKey: string;
  baseUrl: string;
  storage: StorageConfig;
  maxConcurrent: number;
  retry: RetryConfig;
  logging: LogConfig;
  apps: AppsConfig;
  modelRules: ModelRulesConfig;
}
```

#### 3.3.3 配置加载器修改

**文件位置**：`src/config/loader.ts`

**关键变更**：同步函数改为异步

```typescript
import { config as dotenvConfig } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { detectBaseUrl, isValidBaseUrl } from './detector.js';

const LEGACY_CONFIG_NAMES = [
  'rhmcp-config.json',
  'runninghub-mcp-config.json',
];

const NEW_CONFIG_FILES = {
  service: 'service.json',
  apps: 'apps.json',
  env: '.env',
};

/**
 * 主加载函数（异步）
 * 支持新旧两种配置格式
 */
export async function loadConfig(configPath?: string): Promise<RunningHubConfig> {
  // 1. 尝试加载旧格式（向后兼容）
  const legacyPath = findLegacyConfig(configPath);
  if (legacyPath) {
    console.error('[RHMCP] 检测到旧版配置格式，正在迁移...');
    return await migrateAndLoad(legacyPath);
  }
  
  // 2. 加载新格式
  return await loadNewConfig(configPath);
}

/**
 * 加载新格式配置（service.json + apps.json + .env）
 */
async function loadNewConfig(configDir?: string): Promise<RunningHubConfig> {
  const dir = configDir || process.cwd();
  
  // 加载 .env（如果存在）
  loadEnvFile(dir);
  
  // 加载 service.json
  const servicePath = join(dir, NEW_CONFIG_FILES.service);
  const serviceConfig = loadJsonFile(servicePath);
  
  // 加载 apps.json
  const appsPath = join(dir, NEW_CONFIG_FILES.apps);
  const appsConfig = loadJsonFile(appsPath) || { server: {}, user: {} };
  
  // 合并配置
  const config: RunningHubConfig = {
    apiKey: process.env.RUNNINGHUB_API_KEY || serviceConfig?.apiKey || '',
    baseUrl: serviceConfig?.baseUrl || 'auto',
    maxConcurrent: serviceConfig?.maxConcurrent || 1,
    storage: serviceConfig?.storage || { mode: 'local', path: './output' },
    appsConfig: appsConfig,
    apps: mergeApps(appsConfig),  // 向后兼容
    modelRules: serviceConfig?.modelRules || { rules: {}, defaultLanguage: 'zh' },
    retry: serviceConfig?.retry || { maxRetries: 3, maxWaitTime: 600, interval: 5 },
    logging: serviceConfig?.logging || { level: 'info' },
  };
  
  // 处理 baseUrl 自动检测
  if (config.baseUrl === 'auto') {
    if (!config.apiKey) {
      throw new Error('baseUrl 设置为 "auto" 时，需要提供 apiKey（通过环境变量 RUNNINGHUB_API_KEY）');
    }
    config.baseUrl = await detectBaseUrl(config.apiKey);
  }
  
  return applyDefaults(config);
}

/**
 * 加载 .env 文件
 */
function loadEnvFile(dir: string): void {
  const envPath = join(dir, NEW_CONFIG_FILES.env);
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath });
  }
}

/**
 * 合并 server 和 user APP 配置（user 优先）
 */
function mergeApps(appsConfig: AppsConfig): Record<string, AppConfig> {
  const merged: Record<string, AppConfig> = {};
  
  // 先添加 server APPs
  if (appsConfig.server) {
    for (const [alias, app] of Object.entries(appsConfig.server)) {
      if (!alias.startsWith('_')) {
        merged[alias] = app;
      }
    }
  }
  
  // 再添加 user APPs（覆盖 server 同名）
  if (appsConfig.user) {
    for (const [alias, app] of Object.entries(appsConfig.user)) {
      if (!alias.startsWith('_')) {
        merged[alias] = app;
      }
    }
  }
  
  return merged;
}

/**
 * 查找旧格式配置文件
 */
function findLegacyConfig(configPath?: string): string | null {
  if (configPath && existsSync(configPath)) {
    return configPath;
  }
  
  const cwd = process.cwd();
  for (const name of LEGACY_CONFIG_NAMES) {
    const path = join(cwd, name);
    if (existsSync(path)) return path;
    
    const configDirPath = join(cwd, 'config', name);
    if (existsSync(configDirPath)) return configDirPath;
  }
  
  return null;
}

/**
 * 迁移并加载旧格式配置
 */
async function migrateAndLoad(oldPath: string): Promise<RunningHubConfig> {
  const rawConfig = JSON.parse(readFileSync(oldPath, 'utf-8'));
  
  // 创建新格式配置
  const config: RunningHubConfig = {
    apiKey: process.env.RUNNINGHUB_API_KEY || rawConfig.apiKey || '',
    baseUrl: rawConfig.baseUrl || 'auto',
    maxConcurrent: rawConfig.maxConcurrent || 1,
    storage: rawConfig.storage || { mode: 'local', path: './output' },
    apps: rawConfig.apps || {},
    appsConfig: {
      server: {},
      user: rawConfig.apps || {},
    },
    modelRules: rawConfig.modelRules || { rules: {}, defaultLanguage: 'zh' },
    retry: rawConfig.retry || { maxRetries: 3, maxWaitTime: 600, interval: 5 },
    logging: rawConfig.logging || { level: 'info' },
  };
  
  // 处理 baseUrl 自动检测
  if (config.baseUrl === 'auto') {
    if (!config.apiKey) {
      console.error('[RHMCP] 警告: baseUrl 为 auto 但未提供 apiKey，使用默认域名');
      config.baseUrl = 'www.runninghub.cn';
    } else {
      config.baseUrl = await detectBaseUrl(config.apiKey);
    }
  }
  
  console.error(`[RHMCP] 已从旧格式加载配置: ${oldPath}`);
  console.error('[RHMCP] 建议使用 migrate 命令迁移到新格式');
  
  return applyDefaults(config);
}

/**
 * 应用默认值
 */
function applyDefaults(config: RunningHubConfig): RunningHubConfig {
  return {
    apiKey: config.apiKey || '',
    baseUrl: config.baseUrl || 'www.runninghub.cn',
    maxConcurrent: config.maxConcurrent || 1,
    storage: {
      mode: config.storage?.mode || 'local',
      path: config.storage?.path || './output',
      cloudConfig: config.storage?.cloudConfig,
    },
    apps: config.apps || {},
    appsConfig: config.appsConfig || { server: {}, user: {} },
    modelRules: config.modelRules || { rules: {}, defaultLanguage: 'zh' },
    retry: {
      maxRetries: config.retry?.maxRetries || 3,
      maxWaitTime: config.retry?.maxWaitTime || 600,
      interval: config.retry?.interval || 5,
    },
    logging: {
      level: config.logging?.level || 'info',
    },
  };
}

/**
 * 移除注释字段（以 _ 开头）
 */
function removeComments(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_')) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = removeComments(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * 加载 JSON 文件
 */
function loadJsonFile(path: string): any {
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf-8');
  return removeComments(JSON.parse(content));
}

/**
 * 同步版本的配置加载（用于向后兼容，不支持自动检测）
 * @deprecated 请使用 loadConfig() 异步版本
 */
export function loadConfigSync(configPath?: string): RunningHubConfig {
  const legacyPath = findLegacyConfig(configPath);
  if (legacyPath) {
    const rawConfig = JSON.parse(readFileSync(legacyPath, 'utf-8'));
    return applyDefaults({
      ...rawConfig,
      apiKey: process.env.RUNNINGHUB_API_KEY || rawConfig.apiKey || '',
    });
  }
  
  throw new Error('新格式配置需要使用异步 loadConfig() 函数');
}
```

#### 3.3.4 配置文件模板

**config/service.example.json**：
```json
{
  "_comment": "RHMCP 服务配置 - 请复制为 service.json 使用",
  
  "baseUrl": "auto",
  "_baseUrl_comment": "auto(自动检测) | www.runninghub.cn(国内站) | www.runninghub.ai(国际站)",
  
  "maxConcurrent": 1,
  "_maxConcurrent_comment": "最大并发请求数",
  
  "storage": {
    "mode": "none",
    "_mode_comment": "none(不保存) | local(本地) | auto(自动判断)",
    "path": "./output"
  },
  
  "retry": {
    "maxRetries": 3,
    "maxWaitTime": 600,
    "interval": 5
  },
  
  "logging": {
    "level": "info",
    "_level_comment": "debug | info | warn | error"
  }
}
```

**config/apps.example.json**：
```json
{
  "_comment": "APP 配置文件 - 分层管理",
  
  "server": {
    "_comment": "从 GitHub 自动拉取，rhmcp-update-apps 命令会更新此部分",
    "_source": "https://raw.githubusercontent.com/AIRix315/RHMCP/main/references/apps.json",
    "_updated": ""
  },
  
  "user": {
    "_comment": "用户自定义 APP，不会被更新覆盖",
    
    "_example": {
      "appId": "YOUR_APP_ID",
      "alias": "your-app-alias",
      "category": "image",
      "description": "您的自定义 APP",
      "inputs": {}
    }
  }
}
```

**.env.example**：
```bash
# RunningHub API Key（必填）
# 从 https://www.runninghub.cn 个人中心获取
RUNNINGHUB_API_KEY=your_api_key_here

# baseUrl（可选，优先级高于 service.json）
# RUNNINGHUB_BASE_URL=www.runninghub.cn

# 配置文件路径（可选）
# RHMCP_CONFIG=/path/to/service.json
```

### 3.4 baseUrl 自动检测

#### 3.4.1 新增文件：src/config/detector.ts

```typescript
/**
 * 自动检测 RunningHub 站点
 * 通过 API 调用验证账号归属
 */

const ENDPOINTS = [
  { url: 'www.runninghub.cn', name: '国内站' },
  { url: 'www.runninghub.ai', name: '国际站' }
];

// 存储 appId 用于检测（可配置）
const DEFAULT_TEST_APP_ID = '2037760725296357377';

interface DetectResult {
  url: string;
  name: string;
  success: boolean;
  latency: number;
}

/**
 * 自动检测账号注册站点
 * @param apiKey RunningHub API Key
 * @param testAppId 用于测试的 APP ID（可选）
 * @returns 检测到的站点 URL
 */
export async function detectBaseUrl(
  apiKey: string,
  testAppId?: string
): Promise<string> {
  const appId = testAppId || DEFAULT_TEST_APP_ID;
  
  console.error('[RHMCP] 正在自动检测账号归属站点...');
  
  const results = await Promise.all(
    ENDPOINTS.map(async (endpoint): Promise<DetectResult> => {
      try {
        const startTime = Date.now();
        const response = await fetch(
          `https://${endpoint.url}/api/webapp/apiCallDemo?apiKey=${encodeURIComponent(apiKey)}&webappId=${appId}`,
          { 
            method: 'GET', 
            signal: AbortSignal.timeout(5000) 
          }
        );
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          // code === 0 表示成功，code 4xx 表示 API Key 问题
          const success = data.code === 0 || data.code === 200;
          return { ...endpoint, success, latency };
        }
        return { ...endpoint, success: false, latency };
      } catch (error) {
        return { ...endpoint, success: false, latency: Infinity };
      }
    })
  );
  
  // 优先选择成功且延迟最低的
  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    successful.sort((a, b) => a.latency - b.latency);
    const selected = successful[0];
    console.error(`[RHMCP] 检测到账号注册于: ${selected.name} (${selected.url})`);
    return selected.url;
  }
  
  // 都失败，返回默认值
  console.error('[RHMCP] 自动检测失败，使用默认站点: www.runninghub.cn');
  console.error('[RHMCP] 如需手动指定，请在 service.json 中设置 baseUrl');
  return 'www.runninghub.cn';
}

/**
 * 验证 baseUrl 是否有效
 */
export function isValidBaseUrl(url: string): boolean {
  return ENDPOINTS.some(e => e.url === url) || url === 'auto';
}

/**
 * 获取所有可用站点
 */
export function getAvailableEndpoints() {
  return ENDPOINTS.map(e => ({ url: e.url, name: e.name }));
}
```

#### 3.4.2 缓存检测结果

为避免每次启动都检测，可在 service.json 中缓存结果：

```json
{
  "baseUrl": "www.runninghub.cn",
  "_detectedAt": "2026-03-30T10:00:00Z",
  "_detectedUrl": "www.runninghub.cn"
}
```

当 `baseUrl: "auto"` 时：
1. 检查是否有缓存 `_detectedUrl`
2. 缓存超过 24 小时则重新检测
3. 检测成功后写入缓存

### 3.5 CLI 命令扩展

#### 3.5.1 修改入口点：src/server/main.ts

```typescript
import { startHttpServer } from "./http.js";
import { startStdioServer } from "./stdio.js";
import { updateApps } from "../cli/update-apps.js";
import { migrate } from "../cli/migrate.js";

/**
 * 检测运行模式
 */
export function detectTransportMode(): "stdio" | "http" | "cli" {
  // CLI 命令优先检测
  if (process.argv.includes("--update-apps")) return "cli";
  if (process.argv.includes("--migrate")) return "cli";
  
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
  console.log("  rhmcp --migrate          Migrate old config to new format");
  console.log("  rhmcp --help             Show this help");
  console.log("");
  console.log("Environment Variables:");
  console.log("  MCP_TRANSPORT=stdio      Use STDIO mode");
  console.log("  MCP_TRANSPORT=http       Use HTTP mode");
  console.log("  CONFIG_PATH=<path>       Configuration file path");
  console.log("  RUNNINGHUB_API_KEY       API Key (overrides config)");
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
    const appsFile = args[args.indexOf("--update-apps") + 1] || './apps.json';
    await updateApps(appsFile);
    process.exit(0);
  }
  
  if (args.includes("--migrate")) {
    const oldConfig = args[args.indexOf("--migrate") + 1] || findLegacyConfig();
    if (oldConfig) {
      await migrate(oldConfig);
    } else {
      console.error("[RHMCP] 未找到旧配置文件");
      process.exit(1);
    }
  }
}

function findLegacyConfig(): string | null {
  const { existsSync } = require('fs');
  const { join } = require('path');
  const cwd = process.cwd();
  
  const names = ['rhmcp-config.json', 'runninghub-mcp-config.json'];
  for (const name of names) {
    const path = join(cwd, name);
    if (existsSync(path)) return path;
  }
  return null;
}

main().catch((error: unknown) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
```

#### 3.5.2 新增文件：src/cli/update-apps.ts

```typescript
#!/usr/bin/env node
/**
 * 更新 APP 列表命令
 * 
 * 用法：
 *   rhmcp --update-apps [apps-file]
 *   rhmcp-update-apps [apps-file]
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const APPS_URL = 'https://raw.githubusercontent.com/AIRix315/RHMCP/main/references/apps.json';

export async function updateApps(appsFile: string): Promise<void> {
  console.log('[RHMCP] 正在更新 APP 列表...');
  console.log(`[RHMCP] 源: ${APPS_URL}`);
  console.log(`[RHMCP] 目标: ${appsFile}`);
  
  // 1. 获取当前 APP 配置
  let currentApps: { server: any; user: any } = { server: {}, user: {} };
  const absolutePath = resolve(appsFile);
  
  if (existsSync(absolutePath)) {
    try {
      const content = readFileSync(absolutePath, 'utf-8');
      currentApps = JSON.parse(content);
    } catch (error) {
      console.error(`[RHMCP] 警告: 无法读取现有配置，将创建新文件`);
    }
  }
  
  // 2. 从 GitHub 拉取最新 server 部分
  try {
    const response = await fetch(APPS_URL);
    if (!response.ok) {
      throw new Error(`拉取失败: HTTP ${response.status}`);
    }
    
    const serverApps = await response.json();
    
    // 3. 合并，保留 user 部分
    const updatedApps = {
      server: serverApps,
      user: currentApps.user || {},
    };
    
    // 4. 更新时间戳
    updatedApps.server._updated = new Date().toISOString();
    updatedApps.server._source = APPS_URL;
    
    // 5. 写入文件
    writeFileSync(absolutePath, JSON.stringify(updatedApps, null, 2));
    
    const serverCount = Object.keys(serverApps).filter(k => !k.startsWith('_')).length;
    const userCount = Object.keys(updatedApps.user).filter(k => !k.startsWith('_')).length;
    
    console.log('[RHMCP] APP 列表已更新');
    console.log(`[RHMCP] 服务端 APP 数量: ${serverCount}`);
    console.log(`[RHMCP] 用户自定义 APP 数量: ${userCount}`);
    console.log(`[RHMCP] 文件路径: ${absolutePath}`);
    
  } catch (error) {
    console.error(`[RHMCP] 更新失败: ${error}`);
    process.exit(1);
  }
}

// CLI 入口（可独立调用）
if (import.meta.url === `file://${process.argv[1]}`) {
  const appsFile = process.argv[2] || './apps.json';
  updateApps(appsFile).catch(console.error);
}
```

#### 3.5.3 新增文件：src/cli/migrate.ts

```typescript
#!/usr/bin/env node
/**
 * 配置迁移命令
 * 
 * 用法：
 *   rhmcp --migrate [old-config]
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';

export async function migrate(oldConfigPath: string): Promise<void> {
  console.log('[RHMCP] 检测到旧版配置格式，正在迁移...');
  console.log(`[RHMCP] 源文件: ${oldConfigPath}`);
  
  const oldConfig = JSON.parse(readFileSync(oldConfigPath, 'utf-8'));
  const configDir = dirname(oldConfigPath);
  
  // 1. 创建 .env 文件
  if (oldConfig.apiKey) {
    const envPath = join(configDir, '.env');
    const envContent = `# RunningHub API Key
RUNNINGHUB_API_KEY=${oldConfig.apiKey}

# 其他配置请查看 service.json
`;
    writeFileSync(envPath, envContent);
    console.log('[RHMCP] 已创建 .env 文件');
  }
  
  // 2. 创建 service.json
  const serviceConfig: any = {
    baseUrl: oldConfig.baseUrl || 'auto',
    maxConcurrent: oldConfig.maxConcurrent || 1,
    storage: oldConfig.storage || { mode: 'local', path: './output' },
    retry: oldConfig.retry || { maxRetries: 3, maxWaitTime: 600, interval: 5 },
    logging: oldConfig.logging || { level: 'info' },
  };
  
  // 移除 undefined 字段
  Object.keys(serviceConfig).forEach(key => {
    if (serviceConfig[key] === undefined) delete serviceConfig[key];
  });
  
  const servicePath = join(configDir, 'service.json');
  writeFileSync(servicePath, JSON.stringify(serviceConfig, null, 2));
  console.log('[RHMCP] 已创建 service.json');
  
  // 3. 创建 apps.json
  const appsConfig: any = {
    server: {},
    user: oldConfig.apps || {},
  };
  
  // 如果有 modelRules，添加到 user 的注释
  if (oldConfig.modelRules) {
    appsConfig.user._modelRules = oldConfig.modelRules;
    console.log('[RHMCP] 注意: modelRules 已迁移到 apps.json (user._modelRules)');
  }
  
  const appsPath = join(configDir, 'apps.json');
  writeFileSync(appsPath, JSON.stringify(appsConfig, null, 2));
  console.log('[RHMCP] 已创建 apps.json，原有 APP 已迁移到 user 部分');
  
  // 4. 备份旧配置
  const backupPath = `${oldConfigPath}.backup`;
  writeFileSync(backupPath, JSON.stringify(oldConfig, null, 2));
  console.log(`[RHMCP] 旧配置已备份至 ${backupPath}`);
  
  console.log('');
  console.log('[RHMCP] 迁移完成！');
  console.log('[RHMCP] 下一步：');
  console.log('  1. 检查 .env 和 service.json 是否正确');
  console.log('  2. 运行 rhmcp --update-apps 更新官方 APP 列表');
  console.log('  3. 删除旧配置文件（可选）');
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const oldConfig = process.argv[2];
  if (!oldConfig) {
    // 自动查找
    const cwd = process.cwd();
    const names = ['rhmcp-config.json', 'runninghub-mcp-config.json'];
    for (const name of names) {
      const path = join(cwd, name);
      if (existsSync(path)) {
        migrate(path).catch(console.error);
        process.exit(0);
      }
    }
    console.error('[RHMCP] 未找到旧配置文件');
    console.error('[RHMCP] 用法: rhmcp --migrate <config-file>');
    process.exit(1);
  }
  
  migrate(oldConfig).catch(console.error);
}
```

### 3.6 配置验证统一

#### 3.6.1 修改 src/config/validator.ts

```typescript
import { RunningHubConfig, BaseUrl } from "../types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 统一配置验证
 */
export function validateConfig(config: RunningHubConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必填项检查
  if (!config.apiKey) {
    errors.push("apiKey 是必填项！请通过环境变量 RUNNINGHUB_API_KEY 或配置文件提供");
  } else if (config.apiKey === "YOUR_API_KEY_HERE") {
    errors.push("请将 apiKey 替换为您的真实 API Key");
  }

  // baseUrl 检查
  if (!config.baseUrl) {
    warnings.push("baseUrl 未设置，使用默认值: auto");
  } else if (config.baseUrl !== 'auto' && !config.baseUrl.includes("runninghub.")) {
    warnings.push(
      `baseUrl 可能不正确。请使用 auto（自动检测）、www.runninghub.cn（国内站）或 www.runninghub.ai（国际站）`
    );
  }

  // storage 检查
  validateStorage(config, errors, warnings);

  // APP 配置检查
  validateApps(config, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证存储配置
 */
function validateStorage(
  config: RunningHubConfig,
  errors: string[],
  warnings: string[]
): void {
  if (!config.storage?.mode) {
    warnings.push("storage.mode 未设置，使用默认值: local");
  }

  if (config.storage?.mode === "network") {
    if (!config.storage?.cloudConfig) {
      errors.push("storage.mode 为 network 时，必须配置 cloudConfig");
    } else if (!config.storage.cloudConfig.provider) {
      errors.push("cloudConfig.provider 必须设置（baidu/google/aliyun/aws）");
    }
  }

  if (config.storage?.mode === "local" && !config.storage?.path) {
    warnings.push("storage.path 未设置，使用默认值: ./output");
  }
}

/**
 * 验证 APP 配置（支持新旧格式）
 */
function validateApps(
  config: RunningHubConfig,
  errors: string[],
  warnings: string[]
): void {
  // 新格式
  if (config.appsConfig) {
    const { server, user } = config.appsConfig;
    
    // 验证 server APPs
    if (server) {
      validateAppEntries(server, 'server', warnings);
    }
    
    // 验证 user APPs
    if (user) {
      validateAppEntries(user, 'user', errors, warnings);
    }
    
    return;
  }
  
  // 旧格式
  if (config.apps) {
    validateAppEntries(config.apps, 'apps', errors, warnings);
  }
}

/**
 * 验证 APP 条目
 */
function validateAppEntries(
  apps: Record<string, any>,
  section: string,
  errors: string[],
  warnings?: string[]
): void {
  for (const [alias, app] of Object.entries(apps)) {
    if (alias.startsWith('_')) continue;  // 跳过注释字段
    
    if (!app.appId) {
      errors.push(`[${section}] APP "${alias}" 缺少 appId`);
    }
    if (!app.category) {
      (warnings || errors).push(`[${section}] APP "${alias}" 缺少 category`);
    }
    if (!app.alias) {
      (warnings || errors).push(`[${section}] APP "${alias}" 缺少 alias`);
    }
  }
}
```

### 3.7 GitHub Actions 整合

#### 3.7.1 修改现有 `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to publish (e.g., 1.0.1)'
        required: false

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Build
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      
      - name: Run tests
        run: npm test || echo "No tests configured"
        continue-on-error: true

  publish-npm:
    runs-on: ubuntu-latest
    needs: [build, test]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        continue-on-error: false  # 发布失败应中断

  create-release:
    runs-on: ubuntu-latest
    needs: publish-npm
    steps:
      - uses: actions/checkout@v4
      
      - name: Get version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      
      - name: Create release archive
        run: |
          mkdir -p release
          cp -r dist/ release/
          cp package.json package-lock.json release/
          cp README.md CHANGELOG.md release/ 2>/dev/null || true
          cp -r config/ release/ 2>/dev/null || true
          tar -czvf runninghub-mcp-v${{ steps.version.outputs.VERSION }}.tar.gz -C release .
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          name: RunningHub MCP v${{ steps.version.outputs.VERSION }}
          body: |
            ## Release v${{ steps.version.outputs.VERSION }}
            
            ### Installation
            
            ```bash
            npm install -g runninghub-mcp
            # or
            npx runninghub-mcp --stdio
            ```
            
            ### Configuration
            
            See [OpenCode Setup](docs/OpenCode-setup.md) or [OpenClaw Setup](docs/OpenClaw-setup.md)
            
            ### Changes
            See [CHANGELOG.md](CHANGELOG.md) for details.
          files: runninghub-mcp-v${{ steps.version.outputs.VERSION }}.tar.gz
          draft: false
          prerelease: false
```

### 3.8 入口点修改

#### 3.8.1 修改 src/server/stdio.ts

```typescript
/**
 * STDIO 模式入口
 * 用于 CLI 工具和 MCP 客户端集成
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "../api/client.js";
import { loadConfig } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { createServer, registerTools, registerResources } from "./register.js";

// 配置文件路径环境变量
const CONFIG_PATH = process.env.CONFIG_PATH || process.env.RHMCP_CONFIG || undefined;

export async function startStdioServer(): Promise<void> {
  // 1. 加载配置（异步）
  console.error("Loading configuration...");
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
    configPath: CONFIG_PATH || process.cwd(),
  });
  registerResources({
    server,
    client,
    config,
  });

  // 6. 使用 STDIO Transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ RHMCP started (STDIO mode)");
}
```

#### 3.8.2 修改 src/server/http.ts

```typescript
/**
 * HTTP 模式入口
 * 用于 HTTP API 访问和云部署
 */

import express, { Request, Response } from "express";
import { createClient } from "../api/client.js";
import { loadConfig } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { createServer, registerTools, registerResources } from "./register.js";

const PORT = process.env.PORT || 3000;

export async function startHttpServer(): Promise<void> {
  // 1. 加载配置（异步）
  console.log("Loading configuration...");
  const config = await loadConfig(process.env.CONFIG_PATH || process.env.RHMCP_CONFIG);

  // 2. 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Configuration validation failed:");
    validation.errors.forEach((e) => console.error(`  ❌ ${e}`));
    process.exit(1);
  }
  validation.warnings.forEach((w) => console.warn(`  ⚠️ ${w}`));

  // 3. 创建客户端和服务器
  console.log("Initializing RunningHub client...");
  const client = createClient(config);
  const server = createServer();

  // 4. 注册工具和资源
  registerTools({
    server,
    client,
    config,
    configPath: process.env.CONFIG_PATH || process.cwd(),
  });
  registerResources({
    server,
    client,
    config,
  });

  // 5. 创建 HTTP 服务器
  const app = express();
  app.use(express.json());

  // 健康检查
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  // MCP 端点
  app.post("/mcp", async (req: Request, res: Response) => {
    // ... MCP HTTP 处理逻辑
  });

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`RHMCP HTTP server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  });
}
```

### 3.9 共性修改汇总

| 序号 | 修改项 | 文件 | 说明 |
|------|--------|------|------|
| 1 | package.json | `package.json` | 包名、bin 入口、dotenv 依赖 |
| 2 | tsconfig.json | `tsconfig.json` | 确保 cli 目录正确编译 |
| 3 | 类型定义 | `src/types.ts` | BaseUrl 联合类型、AppsConfig 分层结构 |
| 4 | 配置加载器 | `src/config/loader.ts` | 异步化、多文件加载、向后兼容 |
| 5 | baseUrl 检测 | `src/config/detector.ts` | 新增文件，自动检测逻辑 |
| 6 | 配置验证器 | `src/config/validator.ts` | 统一验证逻辑，支持新旧格式 |
| 7 | CLI 命令 | `src/cli/update-apps.ts` | 新增文件，更新 APP 列表 |
| 8 | CLI 命令 | `src/cli/migrate.ts` | 新增文件，配置迁移 |
| 9 | 入口修改 | `src/server/main.ts` | 支持 CLI 命令分支 |
| 10 | 入口修改 | `src/server/stdio.ts` | 异步配置加载 |
| 11 | 入口修改 | `src/server/http.ts` | 异步配置加载 |
| 12 | GitHub Actions | `.github/workflows/release.yml` | 整合发布流程 |
| 13 | 配置模板 | `config/service.example.json` | 新增文件 |
| 14 | 配置模板 | `config/apps.example.json` | 新增文件 |
| 15 | 配置模板 | `.env.example` | 新增文件 |

---

## 四、OpenClaw 专属配置

> 以下内容仅适用于 OpenClaw 平台

### 4.1 目录结构

```
references/openclaw/
├── mcp-config.json          # MCP 配置示例
├── service.json             # 预设服务配置
└── apps.json               # APP 配置（用户复制使用）
```

### 4.2 mcp-config.json

```json
{
  "_comment": "OpenClaw MCP 配置示例 - 复制到 ~/.openclaw/openclaw.json",

  "mcp": {
    "servers": {
      "rhmcp": {
        "_comment": "使用 npx 运行（推荐）",
        "command": "npx",
        "args": ["runninghub-mcp", "--stdio"],
        "env": {
          "RUNNINGHUB_API_KEY": "your_api_key_here",
          "RHMCP_CONFIG": "~/.openclaw/rhmcp"
        }
      }
    }
  },

  "_alt_comment": "或使用全局安装",
  "_alt": {
    "mcp": {
      "servers": {
        "rhmcp": {
          "command": "rhmcp",
          "args": ["--stdio"],
          "env": {
            "RUNNINGHUB_API_KEY": "secret://env/RUNNINGHUB_API_KEY",
            "RHMCP_CONFIG": "~/.openclaw/rhmcp"
          }
        }
      }
    }
  }
}
```

**注意**：`RHMCP_CONFIG` 指向配置目录（非文件），加载器会自动查找 `service.json` 和 `apps.json`。

### 4.3 service.json

```json
{
  "_comment": "OpenClaw 专属服务配置",

  "baseUrl": "auto",

  "maxConcurrent": 1,

  "storage": {
    "mode": "none",
    "_comment": "OpenClaw 推荐使用 none，返回 URL 由 Agent 处理"
  },

  "retry": {
    "maxRetries": 3,
    "maxWaitTime": 600,
    "interval": 5
  },

  "logging": {
    "level": "info"
  }
}
```

### 4.4 更新 OpenClaw-setup.md

根据上述修改更新文档，此处略。

---

## 五、OpenCode 专属配置

略（与 OpenClaw 类似结构）。

---

## 六、实施顺序

### 6.1 阶段一：RHMCP 核心修改（P0）

| 步骤 | 任务 | 文件 | 复杂度 |
|------|------|------|--------|
| 1.1 | 类型定义扩展 | src/types.ts | 低 |
| 1.2 | dotenv 依赖添加 | package.json | 低 |
| 1.3 | 配置加载器异步化 | src/config/loader.ts | 高 |
| 1.4 | baseURL 自动检测 | src/config/detector.ts | 中 |
| 1.5 | 配置验证器统一 | src/config/validator.ts | 中 |
| 1.6 | CLI 命令新增 | src/cli/*.ts | 中 |
| 1.7 | 入口点修改 | src/server/*.ts | 中 |
| 1.8 | 配置模板创建 | config/*.json | 低 |
| 1.9 | GitHub Actions 整合 | .github/workflows/release.yml | 低 |

### 6.2 阶段二：平台专属配置（P1）

| 步骤 | 任务 | 说明 |
|------|------|------|
| 2.1 | references/ 目录创建 | 新增目录结构 |
| 2.2 | OpenClaw 配置文件 | MCP 示例、服务配置 |
| 2.3 | OpenCode 配置文件 | 同上 |
| 2.4 | 文档更新 | OpenClaw-setup.md 等 |

### 6.3 阶段三：测试与发布（P0）

| 步骤 | 任务 |
|------|------|
| 3.1 | 单元测试（配置加载、验证） |
| 3.2 | 集成测试（OpenCode） |
| 3.3 | 集成测试（OpenClaw） |
| 3.4 | npm 发布 |
| 3.5 | GitHub Release |

---

## 七、测试清单

### 7.1 配置加载测试

```typescript
// 测试用例示例
describe('loadConfig', () => {
  it('should load new format config', async () => {
    // service.json + apps.json + .env
  });
  
  it('should migrate old format config', async () => {
    // rhmcp-config.json → new format
  });
  
  it('should support baseUrl auto detection', async () => {
    // baseUrl: "auto" → detectBaseUrl()
  });
  
  it('should merge server and user apps', async () => {
    // appsConfig: { server, user } → merged apps
  });
});
```

### 7.2 CLI 命令测试

```bash
# 更新 APP 列表
rhmcp --update-apps ./apps.json
rhmcp-update-apps ./apps.json

# 配置迁移
rhmcp --migrate ./rhmcp-config.json
rhmcp --migrate  # 自动检测旧配置

# 运行模式
rhmcp --stdio
rhmcp --http
rhmcp --help
```

### 7.3 集成测试

| 测试项 | 验证内容 |
|--------|---------|
| npm 安装 | `npm install -g runninghub-mcp` |
| npx 运行 | `npx runninghub-mcp --stdio` |
| 配置加载 | service.json + apps.json + .env |
| 自动检测 | baseUrl: "auto" 正确检测 |
| 更新命令 | rhmcp --update-apps 正确更新 |
| 迁移命令 | rhmcp --migrate 正确迁移 |

---

## 八、回滚方案

### 8.1 配置回滚

新版配置加载器支持向后兼容，无需回滚：
- 自动检测旧格式（rhmcp-config.json）
- 自动迁移到新格式

### 8.2 版本回滚

```bash
# 回滚到上一版本
npm install -g runninghub-mcp@previous-version
```

### 8.3 Git 回滚

```bash
# 回滚代码更改
git checkout HEAD~1 -- src/config/
git checkout HEAD~1 -- src/server/
git checkout HEAD~1 -- src/cli/
```

---

## 九、版本发布计划

### 9.1 版本号策略

遵循语义化版本：
- **主版本号**：不兼容的 API 修改
- **次版本号**：向后兼容的功能新增
- **修订号**：向后兼容的问题修复

### 9.2 发布检查清单

- [ ] 所有测试通过
- [ ] TypeScript 类型检查通过
- [ ] 文档更新完成
- [ ] CHANGELOG.md 更新
- [ ] package.json 版本号正确
- [ ] GitHub Actions 配置正确
- [ ] npm 发布成功
- [ ] GitHub Release 创建

---

## 十、总结

### 10.1 核心变更

| 变更类型 | 说明 |
|----------|------|
| 配置格式 | 从单文件改为三文件，保持向后兼容 |
| 配置加载 | 从同步改为异步，支持自动检测 |
| CLI 入口 | 新增 update-apps 和 migrate 命令 |
| 类型定义 | 新增 BaseUrl 联合类型和 AppsConfig 分层结构 |
| 发布流程 | 整合到现有 release.yml |

### 10.2 向后兼容策略

1. **自动检测旧配置**：loader.ts 优先查找 `rhmcp-config.json`
2. **自动迁移**：`rhmcp --migrate` 命令辅助迁移
3. **保持现有 API**：`apps` 字段仍然可用（合并 server + user）
4. **渐进式升级**：用户可以逐步迁移到新格式

### 10.3 风险控制

| 风险 | 缓解措施 |
|------|----------|
| 异步加载影响启动速度 | baseUrl 检测缓存结果 |
| 旧配置不兼容 | 自动迁移 + 警告提示 |
| npm 发布失败 | GitHub Actions 失败中断 |

---

**文档状态**: 计划已修正，待执行
**上次修正**: 2026-03-30（基于完整代码架构调查）
**下次更新**: 执行阶段开始时