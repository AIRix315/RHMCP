import { mkdir, writeFile } from "fs/promises";

/**
 * 确保目录存在（递归创建）
 */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/**
 * 写入文件
 */
export async function writeFileFunc(
  path: string,
  content: string,
): Promise<void> {
  await writeFile(path, content, "utf-8");
}

/**
 * 下载文件到本地路径
 * 注意：此函数假设 url 是可直接下载的 URL
 */
export async function downloadFile(
  url: string,
  destPath: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const { writeFile: write } = await import("fs/promises");
  await write(Buffer.from(buffer), destPath);
}
