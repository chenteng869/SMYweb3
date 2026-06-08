import { Module } from '@nestjs/common';
import { BpmService } from './bpm.service';
import { BpmController } from './bpm.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [BpmService, PrismaService],
  controllers: [BpmController],
})
export class BpmModule {}
