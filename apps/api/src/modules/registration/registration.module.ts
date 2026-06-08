import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [RegistrationController],
  providers: [RegistrationService, PrismaService],
  exports: [RegistrationService],
})
export class RegistrationModule {}
