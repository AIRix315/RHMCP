import { z } from 'zod';
import { RunningHubClient } from '../api/client.js';
import { readFile, stat } from 'fs/promises';

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

const UploadMediaSchema = z.object({
  filePath: z.string().describe('本地文件路径'),
  fileType: z.enum(['image', 'audio', 'video', 'input']).describe('文件类型'),
});

export const uploadMediaTool = {
  name: 'rh_upload_media',
  description: '上传媒体文件到RunningHub平台',
  inputSchema: UploadMediaSchema,
  
  async handler(args: z.infer<typeof UploadMediaSchema>, client: RunningHubClient): Promise<{ fileName: string }> {
    // 1. 验证文件存在
    const stats = await stat(args.filePath);
    if (!stats.isFile()) {
      throw new Error(`路径不是文件: ${args.filePath}`);
    }
    
    // 2. 验证文件大小
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`文件过大，最大支持30MB。当前: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // 3. 读取文件
    const buffer = await readFile(args.filePath);
    
    // 4. 调用API上传
    const result = await client.uploadFile(new Uint8Array(buffer), args.fileType);
    
    if (result.code !== 0) {
      throw new Error(`上传失败: ${result.msg}`);
    }
    
    return { fileName: result.data?.fileName ?? '' };
  }
};