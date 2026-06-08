import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [CompaniesService, PrismaService, AuditService],
  controllers: [CompaniesController],
})
export class CompaniesModule {}
