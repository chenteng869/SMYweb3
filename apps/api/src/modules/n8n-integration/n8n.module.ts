import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { N8nIntegrationController } from './n8n.controller';
import { N8nIntegrationService } from './n8n.service';
import { PrismaService } from '../../common/prisma.service';

/**
 * n8n 工作流集成模块
 *
 * 负责与外部 n8n 工作流自动化平台的完整集成，
 * 提供工作流管理、Webhook 通信、执行监控和 BPM 桥接能力。
 *
 * 依赖：
 * - HttpModule: 用于与 n8n REST API 的 HTTP 通信
 * - ConfigService: 读取 N8N_URL / N8N_API_KEY 环境变量
 * - PrismaService: 本地数据持久化（部署记录、审计日志等）
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('N8N_URL', ''),
        timeout: 30000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [N8nIntegrationController],
  providers: [N8nIntegrationService, PrismaService],
  exports: [N8nIntegrationService],
})
export class N8nIntegrationModule {}
