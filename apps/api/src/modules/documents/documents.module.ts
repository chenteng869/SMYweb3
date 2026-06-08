import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [DocumentsService, PrismaService, AuditService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
