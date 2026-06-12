import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { BanksModule } from './modules/banks/banks.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TaxModule } from './modules/tax/tax.module';
import { LegalModule } from './modules/legal/legal.module';
import { AiModule } from './modules/ai/ai.module';
import { VideosModule } from './modules/videos/videos.module';
import { MediaModule } from './modules/media/media.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DlcModule } from './modules/dlc/dlc.module';
import { DvsfModule } from './modules/dvsf/dvsf.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DidModule } from './modules/did/did.module';
import { SystemModule } from './modules/system/system.module';
import { OpenClawModule } from './modules/openclaw/openclaw.module';
import { N8nModule } from './modules/n8n/n8n.module';
import { AiModelsModule } from './modules/ai-models/ai-models.module';
import { BpmModule } from './modules/bpm/bpm.module';
import { LiveModule } from './modules/live/live.module';
import { AcquisitionModule } from './modules/acquisition/acquisition.module';
import { AiTvModule } from './modules/ai-tv/ai-tv.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { KycModule } from './modules/kyc/kyc.module';
import { SbtModule } from './modules/sbt/sbt.module';
import { PlatformAccessModule } from './modules/platform-access/platform-access.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { SignatureModule } from './modules/signature/signature.module';
import { N8nIntegrationModule } from './modules/n8n-integration/n8n.module';
import { PrismaService } from './common/prisma.service';
import { AuditService } from './common/audit.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    WalletsModule,
    DashboardModule,
    UsersModule,
    CompaniesModule,
    BanksModule,
    PaymentsModule,
    TaxModule,
    LegalModule,
    AiModule,
    VideosModule,
    MediaModule,
    DocumentsModule,
    DlcModule,
    DvsfModule,
    OrdersModule,
    NotificationsModule,
    DidModule,
    SystemModule,
    OpenClawModule,
    N8nModule,
    AiModelsModule,
    BpmModule,
    LiveModule,
    AcquisitionModule,
    AiTvModule,
    RegistrationModule,
    KycModule,
    SbtModule,
    PlatformAccessModule,
    EvidenceModule,
    SignatureModule,
    N8nIntegrationModule,
  ],
  providers: [
    PrismaService,
    AuditService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 认证端点：更严格限制（10次/分钟）
    consumer
      .apply(new RateLimitMiddleware(60_000, 10).use.bind(new RateLimitMiddleware(60_000, 10)))
      .forRoutes('api/auth/*');

    // Webhook 端点：宽松限制（60次/分钟）
    consumer
      .apply(new RateLimitMiddleware(60_000, 60).use.bind(new RateLimitMiddleware(60_000, 60)))
      .forRoutes('api/did/webhooks/*');

    // 全局 API：默认限制（100次/分钟）
    consumer
      .apply(new RateLimitMiddleware(60_000, 100).use.bind(new RateLimitMiddleware(60_000, 100)))
      .forRoutes('api/*');
  }
}
