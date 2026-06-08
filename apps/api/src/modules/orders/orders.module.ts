import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [OrdersService, PrismaService, AuditService],
  controllers: [OrdersController],
})
export class OrdersModule {}
