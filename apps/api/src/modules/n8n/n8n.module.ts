import { Module } from '@nestjs/common';
import { N8nService } from './n8n.service';
import { N8nController } from './n8n.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [N8nService, PrismaService, AuditService],
  controllers: [N8nController],
})
export class N8nModule {}
