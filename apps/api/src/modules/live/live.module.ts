import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [LiveService, PrismaService],
  controllers: [LiveController],
})
export class LiveModule {}
