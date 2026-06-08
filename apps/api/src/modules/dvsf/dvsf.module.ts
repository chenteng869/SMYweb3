import { Module } from '@nestjs/common';
import { DvsfService } from './dvsf.service';
import { DvsfController } from './dvsf.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [DvsfService, PrismaService, AuditService],
  controllers: [DvsfController],
})
export class DvsfModule {}
