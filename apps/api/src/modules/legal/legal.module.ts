import { Module } from '@nestjs/common';
import { LegalService } from './legal.service';
import { LegalController } from './legal.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [LegalService, PrismaService, AuditService],
  controllers: [LegalController],
})
export class LegalModule {}
