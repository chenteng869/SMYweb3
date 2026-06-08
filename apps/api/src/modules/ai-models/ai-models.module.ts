import { Module } from '@nestjs/common';
import { AiModelsService } from './ai-models.service';
import { AiModelsController } from './ai-models.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [AiModelsService, PrismaService],
  controllers: [AiModelsController],
})
export class AiModelsModule {}
