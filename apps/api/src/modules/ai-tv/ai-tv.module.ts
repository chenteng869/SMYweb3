import { Module } from '@nestjs/common';
import { AiTvService } from './ai-tv.service';
import { AiTvController } from './ai-tv.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [AiTvService, PrismaService],
  controllers: [AiTvController],
})
export class AiTvModule {}
