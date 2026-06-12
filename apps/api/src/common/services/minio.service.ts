import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import {
  CopyObjectOptions,
  MinIOConfig,
  MinIOHealthStatus,
  ObjectListItem,
  ObjectMeta,
  PresignedResult,
  UploadResult,
} from '../types/minio.types';

// 使用动态导入类型，避免在模块未安装时编译失败
type MinioClient = import('minio').Client;

/**
 * MinIO 对象存储服务 — Bucket 管理、分片上传、预签名 URL
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: MinioClient | null = null;
  private buckets: Set<string> = new Set([
    'smyweb3-files',
    'smyweb3-documents',
    'smyweb3-evidence',
  ]);

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';

    if (!accessKey || !secretKey) {
      this.logger.warn(
        'MINIO_ACCESS_KEY/MINIO_SECRET_KEY not configured — skipping MinIO initialization'
      );
      return;
    }

    // 动态导入避免未安装时的编译问题
    const { Client } = await import('minio');

    const config: MinIOConfig = {
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    };

    this.client = new Client(config);

    // 确保 Buckets 存在
    try {
      for (const bucket of this.buckets) {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket);
          this.logger.log(`Bucket created: ${bucket}`);
        }
      }
      this.logger.log(`MinIO initialized with buckets: ${[...this.buckets].join(', ')}`);
    } catch (e) {
      this.logger.warn(`MinIO bucket setup skipped (server unavailable): ${(e as Error).message}`);
    }
  }

  /** 上传文件（Buffer 或 Stream） */
  async upload(
    bucket: string,
    objectName: string,
    buffer: Buffer | Readable,
    meta?: { contentType?: string; size?: number }
  ): Promise<UploadResult> {
    if (!this.client) throw new Error('MinIO client not initialized');
    if (!this.buckets.has(bucket)) throw new Error(`Bucket "${bucket}" is not allowed`);

    const etag = await this.client.putObject(
      bucket,
      objectName,
      buffer as Buffer,
      meta?.size,
      meta?.contentType ? { 'Content-Type': meta.contentType } : undefined
    );

    return {
      url: this.getObjectUrl(bucket, objectName),
      etag: typeof etag === 'string' ? etag : etag.etag,
      bucket,
      key: objectName,
    };
  }

  /** 获取预签名上传 URL（前端直传用，有效期 15 分钟） */
  async getPresignedPutUrl(
    bucket: string,
    objectName: string,
    expiry = 900
  ): Promise<PresignedResult> {
    if (!this.client) throw new Error('MinIO client not initialized');

    const uploadUrl = await this.client.presignedPutObject(bucket, objectName, expiry);

    return {
      uploadUrl,
      expiresInSeconds: expiry,
      bucket,
      objectName,
    };
  }

  /** 获取预签名下载 URL（有效期 7 天） */
  async getPresignedGetUrl(
    bucket: string,
    objectName: string,
    expiry = 604800
  ): Promise<PresignedResult> {
    if (!this.client) throw new Error('MinIO client not initialized');

    const downloadUrl = (await this.client.presignedGetObject(
      bucket,
      objectName,
      expiry
    )) as string;

    return {
      uploadUrl: downloadUrl,
      downloadUrl,
      expiresInSeconds: expiry,
      bucket,
      objectName,
    };
  }

  /** 删除对象 */
  async remove(bucket: string, objectName: string): Promise<void> {
    if (!this.client) throw new Error('MinIO client not initialized');
    await this.client.removeObject(bucket, objectName);
  }

  /** 获取对象信息 */
  async statObject(bucket: string, objectName: string): Promise<ObjectMeta> {
    if (!this.client) throw new Error('MinIO client not initialized');
    const stat = await this.client.statObject(bucket, objectName);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
      etag: stat.etag,
      contentType: stat.metaData?.['content-type'] ?? '',
      metadata: stat.metaData as Record<string, string> | undefined,
    };
  }

  /** 列出桶内对象 */
  async listObjects(bucket: string, prefix = ''): Promise<ObjectListItem[]> {
    if (!this.client) throw new Error('MinIO client not initialized');

    const stream = this.client.listObjectsV2(bucket, prefix, true);

    return new Promise<ObjectListItem[]>((resolve) => {
      const objects: ObjectListItem[] = [];
      stream.on('data', (obj: import('minio').BucketItem) => {
        objects.push({
          name: obj.name,
          prefix: obj.prefix,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
          isDir: !!obj.prefix,
        });
      });
      stream.on('end', () => resolve(objects));
      stream.on('error', (err: Error) => {
        this.logger.error(err.message);
        resolve([]);
      });
    });
  }

  /** 复制对象 */
  async copy(
    srcBucket: string,
    srcObject: string,
    dstBucket: string,
    dstObject: string
  ): Promise<void> {
    if (!this.client) throw new Error('MinIO client not initialized');
    await this.client.copyObject(dstBucket, dstObject, `${srcBucket}/${srcObject}`);
  }

  /** 获取公开访问 URL */
  getObjectUrl(bucket: string, objectName: string): string {
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    return `http://${this.configService.get('MINIO_ENDPOINT', 'localhost')}:${port}/${bucket}/${objectName}`;
  }

  /** 健康检查 */
  async healthCheck(): Promise<MinIOHealthStatus> {
    if (!this.client) {
      return {
        status: 'unconfigured',
        buckets: [...this.buckets],
        bucketHealth: {},
      };
    }

    try {
      const bucketHealth: Record<string, 'ok' | 'error'> = {};
      for (const bucket of this.buckets) {
        try {
          const exists = await this.client.bucketExists(bucket);
          bucketHealth[bucket] = exists ? 'ok' : 'error';
        } catch {
          bucketHealth[bucket] = 'error';
        }
      }
      const allOk = Object.values(bucketHealth).every((v) => v === 'ok');
      return {
        status: allOk ? 'connected' : 'error',
        buckets: [...this.buckets],
        bucketHealth,
      };
    } catch (e) {
      return {
        status: 'error',
        buckets: [...this.buckets],
        bucketHealth: {},
        error: (e as Error).message,
      };
    }
  }
}
