import { Module } from '@nestjs/common';
import { OpenClawService } from './openclaw.service';
import { OpenClawController } from './openclaw.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [OpenClawService, PrismaService, AuditService],
  controllers: [OpenClawController],
})
export class OpenClawModule {}
