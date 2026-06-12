import { Module, OnModuleInit } from '@nestjs/common';
import { AcquisitionController } from './acquisition.controller';
import { AcquisitionService } from './acquisition.service';
import { PrismaService } from '../../common/prisma.service';
import { LlmProviderFactory } from '../../modules/ai-models/llm/providers/index';

// 平台适配器
import { TwitterAdapter } from './adapters/twitter.adapter';
import { YoutubeAdapter } from './adapters/youtube.adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { XiaohongshuAdapter } from './adapters/xiaohongshu.adapter';

/**
 * 客户获取数据同步模块
 *
 * 负责多平台（Twitter/X、YouTube、Telegram、抖音、小红书）的客户线索
 * 采集、标准化、去重、评分和持久化存储功能
 *
 * 模块依赖：
 * - PrismaService: 数据库操作
 * - LlmProviderFactory: AI 内容质量分析
 */
@Module({
  controllers: [AcquisitionController],
  providers: [
    AcquisitionService,
    PrismaService,
    LlmProviderFactory,
    // 注册所有平台适配器
    TwitterAdapter,
    YoutubeAdapter,
    TelegramAdapter,
    DouyinAdapter,
    XiaohongshuAdapter,
  ],
  exports: [AcquisitionService],
})
export class AcquisitionModule implements OnModuleInit {
  constructor(
    private readonly acquisitionService: AcquisitionService,
    private readonly twitterAdapter: TwitterAdapter,
    private readonly youtubeAdapter: YoutubeAdapter,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly douyinAdapter: DouyinAdapter,
    private readonly xiaohongshuAdapter: XiaohongshuAdapter
  ) {}

  /**
   * 模块初始化时自动注册所有平台适配器
   */
  onModuleInit() {
    // 注册所有平台适配器到服务中
    this.acquisitionService.registerAdapter(this.twitterAdapter);
    this.acquisitionService.registerAdapter(this.youtubeAdapter);
    this.acquisitionService.registerAdapter(this.telegramAdapter);
    this.acquisitionService.registerAdapter(this.douyinAdapter);
    this.acquisitionService.registerAdapter(this.xiaohongshuAdapter);
  }
}
