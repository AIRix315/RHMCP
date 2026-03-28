import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { StorageConfig, StorageMode } from "../types.js";

/**
 * 存储处理模块
 *
 * 支持四种存储模式：
 * - local: 下载文件到本地目录，返回本地路径
 * - network: 上传到云存储，返回云端URL（需配置cloudConfig）
 * - auto: Agent自动判断，需要继续处理返回URL，需交付用户则下载
 * - none: 仅返回RunningHub服务器原始URL，不做任何处理
 */

/**
 * 下载文件到本地
 */
export async function downloadToFile(
  url: string,
  localPath: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const dir = join(localPath, "..");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(localPath, Buffer.from(buffer));
  return localPath;
}

/**
 * 根据存储模式处理生成物
 *
 * @param fileUrl RunningHub服务器返回的文件URL
 * @param fileId 文件唯一标识（用于生成本地文件名）
 * @param config 存储配置
 * @param taskId 任务ID（用于组织目录结构）
 * @returns 处理后的结果
 */
export async function processOutput(
  fileUrl: string,
  fileId: string,
  config: StorageConfig,
  taskId?: string,
): Promise<{
  originalUrl: string;
  localPath?: string;
  cloudUrl?: string;
  mode: StorageMode;
}> {
  const mode = config.mode || "local";

  const result: {
    originalUrl: string;
    localPath?: string;
    cloudUrl?: string;
    mode: StorageMode;
  } = {
    originalUrl: fileUrl,
    mode,
  };

  switch (mode) {
    case "none":
      // 不处理，仅返回原始URL
      return result;

    case "local":
      // 下载到本地
      const localDir = config.path || "./output";
      const timestamp = Date.now();
      const ext = getFileExtension(fileUrl);
      const fileName = taskId
        ? `${taskId}_${fileId}${ext}`
        : `${timestamp}_${fileId}${ext}`;
      const localPath = join(localDir, fileName);

      await downloadToFile(fileUrl, localPath);
      result.localPath = localPath;
      return result;

    case "network":
      // 上传到云存储
      if (!config.cloudConfig) {
        console.warn("cloudConfig未配置，fallback到local模式");
        return processOutput(
          fileUrl,
          fileId,
          { ...config, mode: "local" },
          taskId,
        );
      }

      // TODO: 实现云存储上传
      // 目前fallback到local
      console.warn("云存储上传尚未实现，fallback到local模式");
      return processOutput(
        fileUrl,
        fileId,
        { ...config, mode: "local" },
        taskId,
      );

    case "auto":
      // 自动判断：暂时按local处理
      // Agent可以根据上下文决定是否需要下载
      const autoDir = config.path || "./output";
      const autoTimestamp = Date.now();
      const autoExt = getFileExtension(fileUrl);
      const autoFileName = taskId
        ? `${taskId}_${fileId}${autoExt}`
        : `${autoTimestamp}_${fileId}${autoExt}`;
      const autoPath = join(autoDir, autoFileName);

      await downloadToFile(fileUrl, autoPath);
      result.localPath = autoPath;
      return result;

    default:
      return result;
  }
}

/**
 * 从URL提取文件扩展名
 */
function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = pathname.substring(pathname.lastIndexOf("."));
    return ext || "";
  } catch {
    return "";
  }
}

/**
 * 确保输出目录存在
 */
export function ensureOutputDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

/**
 * 获取默认存储配置
 */
export function getDefaultStorageConfig(): StorageConfig {
  return {
    mode: "local",
    path: "./output",
  };
}

/**
 * 验证存储配置
 */
export function validateStorageConfig(config: StorageConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.mode) {
    warnings.push("storage.mode未设置，将使用默认值: local");
  }

  if (config.mode === "local" && !config.path) {
    warnings.push("storage.path未设置，将使用默认值: ./output");
  }

  if (config.mode === "network") {
    if (!config.cloudConfig) {
      errors.push("storage.mode为network时，必须配置cloudConfig");
    } else if (!config.cloudConfig.provider) {
      errors.push("cloudConfig.provider必须设置（baidu/google/aliyun/aws）");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
