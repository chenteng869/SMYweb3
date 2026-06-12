import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [WalletsService, PrismaService],
  controllers: [WalletsController],
  exports: [WalletsService],
})
export class WalletsModule {}
