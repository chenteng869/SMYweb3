import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [PaymentsService, PrismaService, AuditService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
