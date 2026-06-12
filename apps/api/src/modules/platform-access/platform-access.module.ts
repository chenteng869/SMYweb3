import { Module } from '@nestjs/common';
import { PlatformAccessService } from './platform-access.service';
import { PlatformAccessController } from './platform-access.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [PlatformAccessService, PrismaService],
  controllers: [PlatformAccessController],
})
export class PlatformAccessModule {}
