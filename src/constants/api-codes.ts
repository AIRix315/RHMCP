/**
 * RunningHub API 返回码常量
 */
export const ApiCode = {
  // 成功
  SUCCESS: 0,

  // 任务状态码
  TASK_PENDING: 804,
  TASK_RUNNING: 813,
  TASK_FAILED: 805,

  // 并发控制
  CONCURRENT_LIMIT_421: 421,
  CONCURRENT_LIMIT_415: 415,
} as const;

/**
 * 检查是否为成功响应
 */
export function isSuccess(code: number): boolean {
  return code === ApiCode.SUCCESS || code === 200;
}

/**
 * 检查任务是否在等待中
 */
export function isTaskWaiting(code: number): boolean {
  return code === ApiCode.TASK_PENDING || code === ApiCode.TASK_RUNNING;
}

/**
 * 检查是否为并发限制
 */
export function isConcurrentLimit(code: number): boolean {
  return code === ApiCode.CONCURRENT_LIMIT_421 || code === ApiCode.CONCURRENT_LIMIT_415;
}
