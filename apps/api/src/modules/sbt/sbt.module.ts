import { Module } from '@nestjs/common';
import { SbtService } from './sbt.service';
import { SbtController } from './sbt.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [SbtService, PrismaService],
  controllers: [SbtController],
})
export class SbtModule {}
