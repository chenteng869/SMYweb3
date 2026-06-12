import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [KycService, PrismaService],
  controllers: [KycController],
})
export class KycModule {}
