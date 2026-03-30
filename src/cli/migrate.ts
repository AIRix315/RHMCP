#!/usr/bin/env node
/**
 * 配置迁移命令
 * 
 * 用法：
 *   rhmcp --migrate [old-config]
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { RunningHubConfig, AppConfig } from '../types.js';

/**
 * 旧配置格式（兼容性）
 */
interface LegacyConfig {
  apiKey?: string;
  baseUrl?: string;
  maxConcurrent?: number;
  storage?: { mode?: string; path?: string; cloudConfig?: unknown };
  apps?: Record<string, AppConfig>;
  modelRules?: { rules?: Record<string, unknown>; defaultLanguage?: string };
  retry?: { maxRetries?: number; maxWaitTime?: number; interval?: number };
  logging?: { level?: string };
}

/**
 * 迁移旧配置格式到新格式
 */
export async function migrate(oldConfigPath: string): Promise<void> {
  console.log('[RHMCP] 检测到旧版配置格式，正在迁移...');
  console.log(`[RHMCP] 源文件: ${oldConfigPath}`);
  
  const rawConfig = JSON.parse(readFileSync(oldConfigPath, 'utf-8')) as LegacyConfig;
  const configDir = dirname(oldConfigPath);
  
  // 1. 创建 .env 文件
  if (rawConfig.apiKey) {
    const envPath = join(configDir, '.env');
    const envContent = `# RunningHub API Key
RUNNINGHUB_API_KEY=${rawConfig.apiKey}

# 其他配置请查看 service.json
`;
    writeFileSync(envPath, envContent);
    console.log('[RHMCP] 已创建 .env 文件');
  }
  
  // 2. 创建 service.json
  const serviceConfig: Record<string, unknown> = {
    baseUrl: rawConfig.baseUrl || 'auto',
    maxConcurrent: rawConfig.maxConcurrent || 1,
    storage: rawConfig.storage || { mode: 'local', path: './output' },
    retry: rawConfig.retry || { maxRetries: 3, maxWaitTime: 600, interval: 5 },
    logging: rawConfig.logging || { level: 'info' },
    modelRules: rawConfig.modelRules || { rules: {}, defaultLanguage: 'zh' },
  };
  
  // 移除 undefined 字段
  Object.keys(serviceConfig).forEach(key => {
    if (serviceConfig[key] === undefined) delete serviceConfig[key];
  });
  
  const servicePath = join(configDir, 'service.json');
  writeFileSync(servicePath, JSON.stringify(serviceConfig, null, 2));
  console.log('[RHMCP] 已创建 service.json');
  
  // 3. 创建 apps.json
  const appsConfig: Record<string, unknown> = {
    server: {},
    user: rawConfig.apps || {},
  };
  
  // 如果有 modelRules，添加到 user 的注释
  if (rawConfig.modelRules && Object.keys(rawConfig.modelRules.rules || {}).length > 0) {
    (appsConfig.user as Record<string, unknown>)._modelRules = rawConfig.modelRules;
    console.log('[RHMCP] 注意: modelRules 已迁移到 apps.json (user._modelRules)');
  }
  
  const appsPath = join(configDir, 'apps.json');
  writeFileSync(appsPath, JSON.stringify(appsConfig, null, 2));
  console.log('[RHMCP] 已创建 apps.json，原有 APP 已迁移到 user 部分');
  
  // 4. 备份旧配置
  const backupPath = `${oldConfigPath}.backup`;
  writeFileSync(backupPath, JSON.stringify(rawConfig, null, 2));
  console.log(`[RHMCP] 旧配置已备份至 ${backupPath}`);
  
  console.log('');
  console.log('[RHMCP] 迁移完成！');
  console.log('[RHMCP] 下一步：');
  console.log('  1. 检查 .env 和 service.json 是否正确');
  console.log('  2. 运行 rhmcp --update-apps 更新官方 APP 列表');
  console.log('  3. 删除旧配置文件（可选）');
}

/**
 * 查找旧配置文件
 */
export function findLegacyConfig(): string | null {
  const cwd = process.cwd();
  const names = ['rhmcp-config.json', 'runninghub-mcp-config.json'];
  
  for (const name of names) {
    const path = join(cwd, name);
    if (existsSync(path)) return path;
    
    const configDirPath = join(cwd, 'config', name);
    if (existsSync(configDirPath)) return configDirPath;
  }
  
  return null;
}