import { Module } from '@nestjs/common';
import { SignatureController } from './signature.controller';
import { SignatureService } from './signature.service';
import { PrismaService } from '../../common/prisma.service';
import { MinioService } from '../../common/services/minio.service';

@Module({
  controllers: [SignatureController],
  providers: [SignatureService, PrismaService, MinioService],
  exports: [SignatureService],
})
export class SignatureModule {}
