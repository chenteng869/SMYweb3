import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from '../../../../apps/api/src/common/services/minio.service';
import { Client } from 'minio';

describe('MinioService', () => {
  let service: MinioService;
  let mockMinioClient: jest.Mocked<Client>;
  let mockConfigService: Partial<jest.Mocked<ConfigService>>;

  beforeEach(async () => {
    mockMinioClient = {
      putObject: jest.fn(),
      presignedPutObject: jest.fn(),
      presignedGetObject: jest.fn(),
      removeObject: jest.fn(),
      statObject: jest.fn(),
      listObjectsV2: jest.fn(),
      copyObject: jest.fn(),
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
    } as unknown as jest.Mocked<Client>;

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string | number) => {
        const defaults: Record<string, string | number> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: 9000,
          MINIO_USE_SSL: 'false',
        };
        return defaults[key] ?? defaultValue ?? '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    (service as any).client = mockMinioClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload buffer and return url + etag', async () => {
      const buffer = Buffer.from('test content');
      mockMinioClient.putObject.mockResolvedValue({ etag: 'abc123' } as any);

      const result = await service.upload('smyweb3-files', 'test.txt', buffer, {
        contentType: 'text/plain',
        size: buffer.length,
      });

      expect(result.url).toContain('smyweb3-files/test.txt');
      expect(result.etag).toBe('abc123');
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'smyweb3-files',
        'test.txt',
        buffer,
        buffer.length,
        { 'Content-Type': 'text/plain' }
      );
    });

    it('should throw error for non-allowed bucket', async () => {
      await expect(
        service.upload('invalid-bucket', 'test.txt', Buffer.from('data'))
      ).rejects.toThrow('Bucket "invalid-bucket" is not allowed');
    });
  });

  describe('getPresignedPutUrl', () => {
    it('should return presigned upload URL with default expiry', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('http://minio:9000/presigned-put-url');
      const result = await service.getPresignedPutUrl('smyweb3-documents', 'doc.pdf');
      expect(result).toBe('http://minio:9000/presigned-put-url');
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'smyweb3-documents',
        'doc.pdf',
        900
      );
    });

    it('should use custom expiry when provided', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('url');
      await service.getPresignedPutUrl('smyweb3-documents', 'doc.pdf', 3600);
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'smyweb3-documents',
        'doc.pdf',
        3600
      );
    });
  });

  describe('getPresignedGetUrl', () => {
    it('should return presigned download URL with default expiry', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('http://minio:9000/presigned-get-url');
      const result = await service.getPresignedGetUrl('smyweb3-evidence', 'evidence.zip');
      expect(result).toContain('presigned-get-url');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'smyweb3-evidence',
        'evidence.zip',
        604800
      );
    });
  });

  describe('remove', () => {
    it('should remove object from bucket', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);
      await service.remove('smyweb3-files', 'old-file.txt');
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('smyweb3-files', 'old-file.txt');
    });
  });

  describe('statObject', () => {
    it('should return object stats', async () => {
      const mockStat = { size: 1024, lastModified: new Date(), metaData: {} };
      mockMinioClient.statObject.mockResolvedValue(mockStat);
      const result = await service.statObject('smyweb3-files', 'file.txt');
      expect(result).toEqual(mockStat);
    });
  });

  describe('listObjects', () => {
    it('should list objects in bucket with prefix', async () => {
      const mockStream = {
        on: jest.fn((event: string, cb: (data?: any) => void) => {
          if (event === 'data') cb({ name: 'file1.txt' });
          if (event === 'end') cb();
        }),
      };
      mockMinioClient.listObjectsV2.mockReturnValue(mockStream as any);

      const result = await service.listObjects('smyweb3-files', 'uploads/');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file1.txt');
    });

    it('should return empty array on error', async () => {
      const mockStream = {
        on: jest.fn((event: string, cb: (err?: Error) => void) => {
          if (event === 'error') cb(new Error('stream error'));
        }),
      };
      mockMinioClient.listObjectsV2.mockReturnValue(mockStream as any);

      const result = await service.listObjects('smyweb3-files');
      expect(result).toEqual([]);
    });
  });

  describe('copyObject', () => {
    it('should copy object between buckets', async () => {
      mockMinioClient.copyObject.mockResolvedValue(undefined);
      await service.copy('src-bucket', 'src.obj', 'dst-bucket', 'dst.obj');
      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        'dst-bucket',
        'dst.obj',
        'src-bucket/src.obj'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return ok status when bucket exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.buckets).toBe(3); // default 3 buckets
    });

    it('should return not_ready status when bucket check fails', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      const result = await service.healthCheck();
      expect(result.status).toBe('not_ready');
    });

    it('should return error status on exception', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('connection error'));
      const result = await service.healthCheck();
      expect(result.status).toBe('error');
      expect(result.buckets).toBe(0);
    });
  });
});
