import { Module } from '@nestjs/common';
import { DidService } from './did.service';
import { DidController } from './did.controller';
import { DidN8nWebhooksController } from './did-n8n-webhooks.controller';
import { DidBpmStubsController } from './did-bpm-stubs.controller';
import { DidBpmStubsService } from './did-bpm-stubs.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [DidService, PrismaService, DidBpmStubsService],
  controllers: [DidController, DidN8nWebhooksController, DidBpmStubsController],
})
export class DidModule {}
