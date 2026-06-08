import { Module } from '@nestjs/common';
import { DidService } from './did.service';
import { DidController } from './did.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [DidService, PrismaService, AuditService],
  controllers: [DidController],
})
export class DidModule {}
