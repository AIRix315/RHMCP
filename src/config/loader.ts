import { RunningHubConfig } from '../types.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DEFAULT_CONFIG_NAME = 'runninghub-mcp-config.json';
const ENV_API_KEY = 'RUNNINGHUB_API_KEY';

export function loadConfig(configPath?: string): RunningHubConfig {
  const path = configPath || findConfigFile();
  if (!path || !existsSync(path)) {
    throw new Error('Configuration file not found. Please create runninghub-mcp-config.json');
  }
  
  const content = readFileSync(path, 'utf-8');
  const config = JSON.parse(content);
  
  // 环境变量覆盖
  if (process.env[ENV_API_KEY]) {
    config.apiKey = process.env[ENV_API_KEY];
  }
  
  return config;
}

function findConfigFile(): string | null {
  const cwd = process.cwd();
  const paths = [
    join(cwd, DEFAULT_CONFIG_NAME),
    join(cwd, 'config', DEFAULT_CONFIG_NAME),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}