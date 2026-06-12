import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

/**
 * 创建带基础配置的测试模块
 * 所有集成测试共享此配置，避免重复代码
 *
 * 测试环境覆盖：
 * - 外部服务（RabbitMQ/Redis/MinIO/Blockchain）跳过初始化
 * - 使用固定 JWT_SECRET 以便签发可验证的测试 Token
 * - 使用 SQLite 文件数据库便于测试
 */
export async function createTestModule(modules: any[]): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          () => ({
            // 测试环境覆盖 — 让所有外部服务跳过初始化
            NODE_ENV: 'test',
            DATABASE_URL: 'file:./test.db',
            RABBITMQ_URL: undefined,
            REDIS_URL: undefined,
            MINIO_ENDPOINT: undefined,
            MINIO_ACCESS_KEY: undefined,
            MINIO_SECRET_KEY: undefined,
            BLOCKCHAIN_RPC_URL: undefined,
            BLOCKCHAIN_CONTRACT_ADDRESS: undefined,
            JWT_SECRET: 'test-jwt-secret-for-integration-tests-only',
            JWT_EXPIRES_IN: '1h',
            API_KEY_HEADER: 'x-api-key',
            API_KEYS: ['test-api-key-integration'],
            PORT: 3001,
          }),
        ],
      }),
      ...modules,
    ],
  }).compile();
}

/**
 * 使用测试 JWT Secret 签发一个有效的测试 Token
 * 用于需要认证的测试用例
 */
export function generateTestToken(payload: object): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    'test-jwt-secret-for-integration-tests-only',
    { expiresIn: '1h' }
  );
}
