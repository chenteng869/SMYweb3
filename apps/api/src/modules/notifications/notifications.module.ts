import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [NotificationsService, PrismaService, AuditService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
