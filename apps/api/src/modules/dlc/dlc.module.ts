import { Module } from '@nestjs/common';
import { DlcService } from './dlc.service';
import { DlcController } from './dlc.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [DlcService, PrismaService, AuditService],
  controllers: [DlcController],
})
export class DlcModule {}
