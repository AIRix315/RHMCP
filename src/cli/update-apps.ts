#!/usr/bin/env node
/**
 * 更新 APP 列表命令
 * 
 * 用法：
 *   rhmcp --update-apps [apps-file]
 *   npx runninghub-mcp --update-apps [apps-file]
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppsConfig, AppConfig } from '../types.js';

const APPS_URL = 'https://raw.githubusercontent.com/AIRix315/RHMCP/main/references/apps.json';

export async function updateApps(appsFile: string): Promise<void> {
  console.log('[RHMCP] 正在更新 APP 列表...');
  console.log(`[RHMCP] 源: ${APPS_URL}`);
  console.log(`[RHMCP] 目标: ${appsFile}`);
  
  // 1. 获取当前 APP 配置
  let currentApps: AppsConfig = { server: {}, user: {} };
  const absolutePath = resolve(appsFile);
  
  if (existsSync(absolutePath)) {
    try {
      const content = readFileSync(absolutePath, 'utf-8');
      const parsed = JSON.parse(content) as Partial<AppsConfig>;
      if (parsed.server) currentApps.server = parsed.server;
      if (parsed.user) currentApps.user = parsed.user;
    } catch {
      console.error('[RHMCP] 警告: 无法读取现有配置，将创建新文件');
    }
  }
  
  // 2. 从 GitHub 拉取最新 server 部分
  try {
    const response = await fetch(APPS_URL);
    if (!response.ok) {
      throw new Error(`拉取失败: HTTP ${response.status}`);
    }
    
    const serverApps = await response.json() as Record<string, AppConfig>;
    
    // 3. 合并，保留 user 部分
    const updatedApps: AppsConfig = {
      server: serverApps,
      user: currentApps.user || {},
    };
    
    // 4. 更新时间戳和来源（作为元数据字段）
    (updatedApps.server as Record<string, unknown>)._updated = new Date().toISOString();
    (updatedApps.server as Record<string, unknown>)._source = APPS_URL;
    
    // 5. 写入文件
    writeFileSync(absolutePath, JSON.stringify(updatedApps, null, 2));
    
    // 统计
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

/**
 * 合并 server 和 user APP 配置
 */
export function mergeApps(appsConfig: AppsConfig | undefined): Record<string, AppConfig> {
  if (!appsConfig) return {};
  
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