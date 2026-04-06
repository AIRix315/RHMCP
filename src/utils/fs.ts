import { mkdir, writeFile } from "fs/promises";

/**
 * 确保目录存在（递归创建）
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    throw new Error(
      `创建目录失败: ${dir}, ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 写入文件
 */
export async function writeFileFunc(path: string, content: string): Promise<void> {
  try {
    await writeFile(path, content, "utf-8");
  } catch (error) {
    throw new Error(
      `写入文件失败: ${path}, ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 下载文件到本地路径
 * 注意：此函数假设 url 是可直接下载的 URL
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const { writeFile: write } = await import("fs/promises");
    await write(Buffer.from(buffer), destPath);
  } catch (error) {
    throw new Error(
      `下载文件失败: ${url}, ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
