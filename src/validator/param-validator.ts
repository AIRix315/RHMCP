import { Constraint, InputParam } from "../types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Constraints {
  service?: Record<string, Constraint>;
  model?: Record<string, Constraint>;
  app?: Record<string, Constraint>;
}

// 服务级约束（硬编码）
const SERVICE_CONSTRAINTS: Record<string, Constraint> = {
  maxFileSize: { max: 30 * 1024 * 1024 }, // 30MB
};

/**
 * 合并多层约束（优先级：app > model > service）
 */
export function mergeConstraints(constraints: Constraints): Record<string, Constraint> {
  const result: Record<string, Constraint> = { ...SERVICE_CONSTRAINTS };

  // 合并模型级约束
  if (constraints.model) {
    for (const [key, value] of Object.entries(constraints.model)) {
      result[key] = { ...result[key], ...value };
    }
  }

  // 合并APP级约束（最高优先级）
  if (constraints.app) {
    for (const [key, value] of Object.entries(constraints.app)) {
      result[key] = { ...result[key], ...value };
    }
  }

  return result;
}

/**
 * 验证参数是否符合约束
 */
export function validateParams(
  params: Record<string, any>,
  inputs: Record<string, InputParam>,
  constraints: Record<string, Constraint>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [paramName, paramConfig] of Object.entries(inputs)) {
    const value = params[paramName];
    const constraint = constraints[paramName] || {};

    // 检查必填
    if (paramConfig.required && (value === undefined || value === "")) {
      errors.push(`参数 "${paramName}" 是必填项`);
      continue;
    }

    // 如果没有值，跳过后续验证
    if (value === undefined || value === "") continue;

    // 类型验证
    switch (paramConfig.type) {
      case "INT":
      case "FLOAT":
        if (typeof value !== "number") {
          errors.push(`参数 "${paramName}" 必须是数字`);
        } else {
          if (constraint.min !== undefined && value < constraint.min) {
            errors.push(`参数 "${paramName}"=${value} 小于最小值 ${constraint.min}`);
          }
          if (constraint.max !== undefined && value > constraint.max) {
            errors.push(`参数 "${paramName}"=${value} 大于最大值 ${constraint.max}`);
          }
        }
        break;

      case "STRING":
        if (typeof value !== "string") {
          errors.push(`参数 "${paramName}" 必须是字符串`);
        } else if (constraint.maxLength && value.length > constraint.maxLength) {
          errors.push(`参数 "${paramName}" 长度超过限制 ${constraint.maxLength}`);
        }
        // 语言验证
        if (constraint.languages && constraint.languages.length > 0) {
          // 简单检测：是否包含非支持语言字符
          // 这里可以扩展为更精确的语言检测
        }
        break;

      case "LIST":
        if (paramConfig.options && !paramConfig.options.includes(String(value))) {
          errors.push(`参数 "${paramName}"=${value} 不在有效选项中`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
