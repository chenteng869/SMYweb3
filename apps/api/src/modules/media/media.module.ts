import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [MediaService, PrismaService, AuditService],
  controllers: [MediaController],
})
export class MediaModule {}
