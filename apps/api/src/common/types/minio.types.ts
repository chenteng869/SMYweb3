/** MinIO 客户端配置 */
export interface MinIOConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region?: string;
}

/** 上传结果 */
export interface UploadResult {
  url: string;
  etag: string;
  versionId?: string;
  bucket: string;
  key: string;
}

/** 预签名 URL 结果 */
export interface PresignedResult {
  uploadUrl: string;
  downloadUrl?: string;
  expiresInSeconds: number;
  bucket: string;
  objectName: string;
}

/** 对象元信息 */
export interface ObjectMeta {
  size: number;
  lastModified: Date;
  etag: string;
  contentType: string;
  metadata?: Record<string, string>;
}

/** 对象列表项 */
export interface ObjectListItem {
  name: string;
  prefix?: string;
  size: number;
  lastModified: Date;
  etag: string;
  isDir: boolean;
}

/** 对象复制选项 */
export interface CopyObjectOptions {
  sourceBucket: string;
  sourceObject: string;
  destBucket: string;
  destObject: string;
  conditions?: Record<string, string>;
}

/** MinIO 服务健康状态 */
export interface MinIOHealthStatus {
  status: 'connected' | 'disconnected' | 'error' | 'unconfigured';
  buckets: string[];
  bucketHealth: Record<string, 'ok' | 'error'>;
  error?: string;
}
