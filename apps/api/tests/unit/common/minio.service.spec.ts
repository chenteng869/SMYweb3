import { MinioService } from '../../../src/common/services/minio.service';
import { ConfigService } from '@nestjs/config';

// Module-level storage for mock client - set in beforeEach, read by factory
let _mockMinioClient: any = {};

function getMockMinioClient(): any {
  return _mockMinioClient;
}

jest.mock('minio', () => ({
  __esModule: true,
  Client: jest.fn(() => getMockMinioClient()),
}));

describe('MinioService', () => {
  let minioService: MinioService;
  let mockConfigService: any;
  let mockMinioClient: any;

  beforeEach(() => {
    mockMinioClient = {
      putObject: jest.fn().mockResolvedValue({ etag: 'abc123' }),
      presignedPutObject: jest.fn().mockResolvedValue('http://put-url'),
      presignedGetObject: jest.fn().mockResolvedValue('http://get-url'),
      removeObject: jest.fn().mockResolvedValue(undefined),
      statObject: jest.fn().mockResolvedValue({ size: 1024, etag: 'etag123', lastModified: new Date('2024-01-01'), metaData: { 'content-type': 'text/plain' } }),
      listObjectsV2: jest.fn().mockReturnValue({
        on: jest.fn((event: string, cb: (data?: any) => void) => {
          if (event === 'end') cb();
          return { on: jest.fn() };
        }),
      }),
      copyObject: jest.fn().mockResolvedValue(undefined),
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn().mockResolvedValue(undefined),
    };

    _mockMinioClient = mockMinioClient;

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, unknown> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: 9000,
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
          MINIO_USE_SSL: 'false',
        };
        return config[key];
      }),
    };

    minioService = new MinioService(mockConfigService as ConfigService);
  });

  /** 辅助函数：初始化服务并确保 client 被正确设置（绕过动态 import） */
  async function initService(): Promise<void> {
    await minioService.onModuleInit();
    // 动态 import 可能导致 mock 失效，手动设置 client
    if (!(minioService as any).client) {
      (minioService as any).client = mockMinioClient;
    }
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('onModuleInit 应使用配置创建 MinIO 客户端', async () => {
      await initService();

      const { Client } = require('minio');
      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endPoint: 'localhost',
          port: 9000,
          useSSL: false,
          accessKey: 'minioadmin',
          secretKey: 'minioadmin',
        })
      );
    });

    it('onModuleInit 应确保默认 buckets 存在', async () => {
      await initService();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledTimes(3);
    });
  });

  describe('上传文件', () => {
    beforeEach(async () => {
      await initService();
    });

    it('应成功上传 Buffer 文件', async () => {
      const buffer = Buffer.from('file content');
      const result = await minioService.upload('smyweb3-files', 'test.txt', buffer, {
        contentType: 'text/plain',
        size: buffer.length,
      });

      expect(result.url).toContain('smyweb3-files/test.txt');
      expect(result.etag).toBeDefined();
      expect(result.bucket).toBe('smyweb3-files');
      expect(result.key).toBe('test.txt');
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'smyweb3-files',
        'test.txt',
        buffer,
        buffer.length,
        expect.objectContaining({ 'Content-Type': 'text/plain' })
      );
    });

    it('不允许上传到未授权的 bucket', async () => {
      await expect(
        minioService.upload('forbidden-bucket', 'x.txt', Buffer.from('x'))
      ).rejects.toThrow('not allowed');
    });
  });

  describe('预签名 URL', () => {
    beforeEach(async () => {
      await initService();
    });

    it('生成预签名上传 URL', async () => {
      const result = await minioService.getPresignedPutUrl('smyweb3-documents', 'doc.pdf');

      expect(result.uploadUrl).toBe('http://put-url');
      expect(result.bucket).toBe('smyweb3-documents');
      expect(result.objectName).toBe('doc.pdf');
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'smyweb3-documents',
        'doc.pdf',
        900
      );
    });

    it('生成预签名下载 URL', async () => {
      const result = await minioService.getPresignedGetUrl('smyweb3-evidence', 'ev.bin');

      expect(result.downloadUrl).toBe('http://get-url');
      expect(result.bucket).toBe('smyweb3-evidence');
      expect(result.objectName).toBe('ev.bin');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'smyweb3-evidence',
        'ev.bin',
        604800
      );
    });
  });

  describe('删除和查询', () => {
    beforeEach(async () => {
      await initService();
    });

    it('删除对象', async () => {
      await minioService.remove('smyweb3-files', 'old.txt');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('smyweb3-files', 'old.txt');
    });

    it('获取对象信息', async () => {
      const stat = await minioService.statObject('smyweb3-files', 'info.txt');

      expect(stat.size).toBe(1024);
      expect(stat.etag).toBe('etag123');
      expect(stat.lastModified).toBeDefined();
      expect(stat.contentType).toBe('text/plain');
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('smyweb3-files', 'info.txt');
    });

    it('列出桶内对象', async () => {
      const objects = await minioService.listObjects('smyweb3-files', 'prefix/');

      expect(Array.isArray(objects)).toBe(true);
    });
  });

  describe('复制对象', () => {
    beforeEach(async () => {
      await initService();
    });

    it('复制对象到目标位置', async () => {
      await minioService.copy('smyweb3-files', 'src.txt', 'smyweb3-documents', 'dst.txt');

      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        'smyweb3-documents',
        'dst.txt',
        'smyweb3-files/src.txt'
      );
    });
  });

  describe('健康检查', () => {
    it('bucket 存在时返回 connected 状态', async () => {
      await initService();

      const result = await minioService.healthCheck();

      expect(result.status).toBe('connected');
      expect(result.buckets).toHaveLength(3);
      expect(Array.isArray(result.buckets)).toBe(true);
      expect(result.bucketHealth).toBeDefined();
    });

    it('异常时返回 error', async () => {
      // 先初始化确保 client 存在
      await initService();

      // Make bucketExists throw by using a custom implementation
      const originalBucketExists = mockMinioClient.bucketExists;
      mockMinioClient.bucketExists = jest.fn(() => {
        throw new Error('fail');
      });

      const result = await minioService.healthCheck();

      expect(result.status).toBe('error');
      // Restore original mock
      mockMinioClient.bucketExists = originalBucketExists;
    });
  });
});
