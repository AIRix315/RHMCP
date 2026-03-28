import { RunningHubConfig } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(config: RunningHubConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 必填项检查
  if (!config.apiKey) {
    errors.push('apiKey is required');
  }
  if (!config.baseUrl) {
    errors.push('baseUrl is required');
  }
  
  // APP配置检查
  for (const [alias, app] of Object.entries(config.apps || {})) {
    if (!app.appId) {
      errors.push(`App "${alias}" is missing appId`);
    }
    if (!app.category) {
      warnings.push(`App "${alias}" is missing category`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}