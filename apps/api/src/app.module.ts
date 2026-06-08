import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
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
import { PrismaService } from './common/prisma.service';
import { AuditService } from './common/audit.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
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
  ],
  providers: [
    PrismaService,
    AuditService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
