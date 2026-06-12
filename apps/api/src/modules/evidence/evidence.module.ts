import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';
import { PrismaService } from '../../common/prisma.service';
import { MinioService } from '../../common/services/minio.service';

/**
 * 区块链存证模块
 *
 * 提供文件上链存证、链下验证、IPFS 存储等核心能力。
 * 依赖 Prisma（数据库）、MinIO（对象存储）、Config（环境配置）。
 */
@Module({
  imports: [ConfigModule],
  controllers: [EvidenceController],
  providers: [EvidenceService, PrismaService, MinioService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
