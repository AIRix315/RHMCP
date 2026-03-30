/**
 * 测试辅助工具 - Mock 文件系统
 * 模拟配置文件、输出文件等
 */

import { vi } from "vitest";
import type { Stats } from "fs";

/**
 * 模拟文件系统内容
 */
export interface MockFileSystem {
  files: Map<string, string | Buffer>;
  directories: Set<string>;
}

/**
 * 创建 Mock 文件系统
 */
export function createMockFs(): {
  fs: MockFileSystem;
  mockFsModule: () => void;
  setFile: (path: string, content: string | Buffer) => void;
  setDirectory: (path: string) => void;
  remove: (path: string) => void;
  clear: () => void;
} {
  const fs: MockFileSystem = {
    files: new Map(),
    directories: new Set(),
  };

  const mockFsModule = () => {
    const mockFs = {
      existsSync: vi.fn((path: string) => {
        return fs.files.has(path) || fs.directories.has(path);
      }),
      readFileSync: vi.fn((path: string, encoding?: BufferEncoding) => {
        const content = fs.files.get(path);
        if (content === undefined) {
          const error = new Error(
            `ENOENT: no such file or directory, open '${path}'`
          ) as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        }
        return encoding
          ? content.toString()
          : Buffer.isBuffer(content)
            ? content
            : Buffer.from(content);
      }),
      writeFileSync: vi.fn((path: string, data: string | Buffer) => {
        fs.files.set(path, data);
        // 自动创建父目录
        const parts = path.split(/[/\\]/);
        for (let i = 1; i < parts.length; i++) {
          fs.directories.add(parts.slice(0, i).join("/"));
        }
      }),
      mkdirSync: vi.fn((path: string, options?: { recursive?: boolean }) => {
        if (options?.recursive) {
          const parts = path.split(/[/\\]/);
          for (let i = 1; i <= parts.length; i++) {
            fs.directories.add(parts.slice(0, i).join("/"));
          }
        } else {
          fs.directories.add(path);
        }
        return path;
      }),
      statSync: vi.fn((path: string): Stats => {
        if (!fs.files.has(path) && !fs.directories.has(path)) {
          const error = new Error(
            `ENOENT: no such file or directory, stat '${path}'`
          ) as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        }
        const isDir = fs.directories.has(path);
        return {
          isFile: () => !isDir,
          isDirectory: () => isDir,
          size: fs.files.has(path) ? (fs.files.get(path) as Buffer).length : 0,
          mode: 0o644,
          mtime: new Date(),
          mtimeMs: Date.now(),
        } as Stats;
      }),
    };

    vi.doMock("fs", () => mockFs);

    return mockFs;
  };

  return {
    fs,
    mockFsModule,
    setFile: (path: string, content: string | Buffer) => {
      fs.files.set(path, content);
    },
    setDirectory: (path: string) => {
      fs.directories.add(path);
    },
    remove: (path: string) => {
      fs.files.delete(path);
      fs.directories.delete(path);
    },
    clear: () => {
      fs.files.clear();
      fs.directories.clear();
    },
  };
}

/**
 * 创建临时内存文件系统（不实际写入磁盘）
 */
export function createMemoryFs(): {
  files: Map<string, string>;
  readFile: (path: string) => string | null;
  writeFile: (path: string, content: string) => void;
  exists: (path: string) => boolean;
  clear: () => void;
} {
  const files = new Map<string, string>();

  return {
    files,
    readFile: (path: string) => files.get(path) ?? null,
    writeFile: (path: string, content: string) => files.set(path, content),
    exists: (path: string) => files.has(path),
    clear: () => files.clear(),
  };
}
