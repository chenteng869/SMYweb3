# DID 统一身份系统 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 DID 统一身份系统 MVP，包含 DID 注册/钱包签名登录/KYC 状态/SBT 凭证/平台权限查询/审计日志

**Architecture:** 在现有 NestJS API (apps/api) + admin-web (React) + H5 (Vue 3) 架构中嵌入 DID 模块。后端扩展 Prisma 8 张 DID 表 + 新增 7 个 NestJS 子模块；前端增强 3 个 DID 管理页面 (List/Issue/Cards) + H5 钱包登录页

**Tech Stack:** NestJS 10 + Prisma (SQLite→PostgreSQL) + ethers.js + JWT + React 19 + Vue 3 + Solidity ^0.8.20

**参考文档:**

- `docs/did/00-overview.md` — DID 总览/定位/MVP清单
- `docs/did/01-prd.md` — 完整 PRD：角色/生命周期/功能模块
- `docs/did/02-database.md` — 8 张表完整 SQL
- `docs/did/03-contracts.md` — DIDRegistry.sol + ZSDTSBT.sol
- `docs/did/04-api.md` — 15 个 RESTful API
- `docs/did/05-wallet-login.md` — 钱包签名登录代码
- `docs/did/06-backend-structure.md` — 后端/前端项目结构
- `docs/did/07-integration-roadmap.md` — n8n/BPM/四平台/路线图

---

## 文件结构总览

### 后端 (apps/api) — 新增/修改文件

```
apps/api/
├── prisma/
│   └── schema.prisma            # MODIFY: 新增 8 张 DID 表
├── src/
│   ├── common/
│   │   └── guards/
│   │       └── api-key.guard.ts  # CREATE: API Key 认证守卫
│   ├── modules/
│   │   ├── did/                  # REWRITE: 现有 DID 模块扩展为完整模块
│   │   │   ├── did.module.ts
│   │   │   ├── did.controller.ts
│   │   │   ├── did.service.ts
│   │   │   └── dto/
│   │   │       ├── register-did.dto.ts
│   │   │       └── update-did.dto.ts
│   │   ├── wallets/              # CREATE: 钱包管理模块(含Nonce)
│   │   │   ├── wallets.module.ts
│   │   │   ├── wallets.controller.ts
│   │   │   ├── wallets.service.ts
│   │   │   └── dto/
│   │   │       └── bind-wallet.dto.ts
│   │   ├── kyc/                  # CREATE: KYC 模块
│   │   │   ├── kyc.module.ts
│   │   │   ├── kyc.controller.ts
│   │   │   ├── kyc.service.ts
│   │   │   └── dto/
│   │   │       └── submit-kyc.dto.ts
│   │   ├── sbt/                  # CREATE: SBT 凭证模块
│   │   │   ├── sbt.module.ts
│   │   │   ├── sbt.controller.ts
│   │   │   ├── sbt.service.ts
│   │   │   └── dto/
│   │   │       ├── issue-sbt.dto.ts
│   │   │       └── revoke-sbt.dto.ts
│   │   ├── platform-access/      # CREATE: 平台权限模块
│   │   │   ├── platform-access.module.ts
│   │   │   ├── platform-access.controller.ts
│   │   │   └── platform-access.service.ts
│   │   └── audit/                # CREATE: 审计日志模块
│   │       ├── audit.module.ts
│   │       ├── audit.controller.ts
│   │       └── audit.service.ts
│   └── app.module.ts             # MODIFY: 注册所有新模块
```

### 前端 (apps/admin-web) — 修改文件

```
apps/admin-web/src/
├── pages/did/
│   ├── List.tsx          # REWRITE: 完整 DID 管理列表(带搜索/筛选/冻结/解冻)
│   ├── Issue.tsx         # REWRITE: 完整签发管理(含KYC审核/SBT签发)
│   └── Cards.tsx         # REWRITE: 名片管理(对接DID身份)
├── lib/
│   ├── api.ts            # MODIFY: 新增 DID API 方法
│   └── constants.ts      # CHECK: DID 菜单已存在
```

### 前端 (apps/h5) — 新增文件

```
apps/h5/src/
├── pages/
│   ├── WalletLogin.vue     # CREATE: 钱包连接/签名登录页面
│   └── DIDProfile.vue      # CREATE: DID 身份信息展示页面
├── lib/
│   ├── did-api.ts          # CREATE: DID API 客户端
│   └── wagmi.ts            # CREATE: WalletConnect 配置
├── components/
│   └── WalletConnectBtn.vue # CREATE: 钱包连接按钮组件
└── package.json            # MODIFY: 添加 wagmi/viem/ethers 依赖
```

---

## 实施任务

### Task 1: 扩展 Prisma Schema — 新增 8 张 DID 表

**Files:**

- Modify: `apps/api/prisma/schema.prisma` (在现有 DidIdentity 模型基础上增强)

目标：将现有简单的 `DidIdentity` 模型扩展为完整的 8 表结构文档

- [ ] **Step 1.1: 读取现有 schema 末尾位置**

Read: `apps/api/prisma/schema.prisma` (末尾区域，在 DidIdentity 模型之后)

- [ ] **Step 1.2: 增强 DidIdentity 模型**

将现有:

```prisma
model DidIdentity {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique
  user        User      @relation(fields: [userId], references: [id])
  did         String    @unique
  publicKey   String
  blockchain  String    @default("wopc-chain")
  status      String    @default("active")
  issuedAt    DateTime  @default(now())
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

增强为完整 DID 模型:

```prisma
model DidIdentity {
  id              Int       @id @default(autoincrement())
  userId          Int       @unique
  user            User      @relation(fields: [userId], references: [id])
  did             String    @unique                // did:zsdt:U202600000001
  didMethod       String    @default("zsdt")
  status          String    @default("pending")    // pending/created/kyc_pending/verified/active/restricted/frozen/revoked/deactivated
  kycStatus       String    @default("unverified") // unverified/pending/verified/rejected
  amlStatus       String    @default("unchecked")  // unchecked/pending/cleared/suspicious
  riskLevel       String    @default("low")        // low/medium/high/critical
  memberLevel     String    @default("standard")   // standard/gold/platinum/diamond
  primaryWallet   String?
  credentialHash  String?
  chainTxHash     String?
  activatedAt     DateTime?
  frozenAt        DateTime?
  revokedAt       DateTime?
  issuedAt        DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  wallets         WalletAccount[]
  kycRecords      KycRecord[]
  credentials     SbtCredential[]
  permissions     PlatformPermission[]
  auditLogs       DidAuditLog[]

  @@index([status])
  @@index([kycStatus])
  @@map("did_identities")
}
```

- [ ] **Step 1.3: 新增 WalletAccount 模型**

```prisma
model WalletAccount {
  id              Int       @id @default(autoincrement())
  userId          Int
  user            User      @relation(fields: [userId], references: [id])
  didId           Int?
  did             DidIdentity? @relation(fields: [didId], references: [id])
  walletAddress   String
  chainId         String    @default("1")          // 1=ETH, 56=BSC
  walletType      String?                          // metamask/okx/binance
  isPrimary       Boolean   @default(false)
  role            String    @default("primary")    // primary/backup/payment/exchange/ecommerce/gaming
  riskStatus      String    @default("normal")     // normal/suspicious/blocked
  lastLoginAt     DateTime?
  linkedAt        DateTime  @default(now())
  unlinkedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([walletAddress, chainId])
  @@index([userId])
  @@index([didId])
  @@map("wallet_accounts")
}
```

- [ ] **Step 1.4: 新增 WalletNonce 模型**

```prisma
model WalletNonce {
  id              Int       @id @default(autoincrement())
  walletAddress   String
  nonce           String    @unique
  purpose         String    @default("login")      // login/bind/unbind
  expiredAt       DateTime
  used            Boolean   @default(false)
  createdAt       DateTime  @default(now())

  @@index([walletAddress])
  @@index([expiredAt])
  @@map("wallet_nonces")
}
```

- [ ] **Step 1.5: 新增 KycRecord 模型**

```prisma
model KycRecord {
  id                  Int       @id @default(autoincrement())
  userId              Int
  user                User      @relation(fields: [userId], references: [id])
  didId               Int?
  did                 DidIdentity? @relation(fields: [didId], references: [id])
  provider            String    @default("manual") // manual/onfido/sumsub
  kycStatus           String    @default("pending") // pending/reviewing/approved/rejected/expired
  fullNameEncrypted   String?   @map("full_name_encrypted")
  documentType        String?   @map("document_type")
  documentNoEncrypted String?   @map("document_no_encrypted")
  country             String?
  verificationResult  String?   @map("verification_result") // JSON
  resultHash          String?   @map("result_hash")
  rejectionReason     String?   @map("rejection_reason")
  reviewedBy          Int?
  reviewedAt          DateTime? @map("reviewed_at")
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId])
  @@index([didId])
  @@index([kycStatus])
  @@map("kyc_records")
}
```

- [ ] **Step 1.6: 新增 SbtCredential 模型**

```prisma
model SbtCredential {
  id                Int       @id @default(autoincrement())
  userId            Int
  user              User      @relation(fields: [userId], references: [id])
  didId             Int?
  did               DidIdentity? @relation(fields: [didId], references: [id])
  walletAddress     String
  contractAddress   String?   @map("contract_address")
  tokenId           String?   @map("token_id")
  credentialType    String    @map("credential_type")  // KYC_VERIFIED/MEMBER/VIP/MERCHANT/...
  credentialLevel   String?   @map("credential_level") // standard/gold/platinum
  chainId           String?
  status            String    @default("active")       // active/revoked/expired
  txHash            String?   @map("tx_hash")
  metadataUri       String?   @map("metadata_uri")
  issuedBy          Int?      @map("issued_by")
  issuedAt          DateTime  @default(now()) @map("issued_at")
  revokedBy         Int?      @map("revoked_by")
  revokedAt         DateTime? @map("revoked_at")
  revokeReason      String?   @map("revoke_reason")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
  @@index([didId])
  @@index([credentialType])
  @@index([status])
  @@map("sbt_credentials")
}
```

- [ ] **Step 1.7: 新增 PlatformPermission 模型**

```prisma
model PlatformPermission {
  id                Int       @id @default(autoincrement())
  userId            Int
  user              User      @relation(fields: [userId], references: [id])
  didId             Int?
  did               DidIdentity? @relation(fields: [didId], references: [id])
  platform          String    // portal/ecommerce/exchange/gaming
  allowed           Boolean   @default(false)
  permissionStatus  String    @default("pending") @map("permission_status") // pending/approved/denied/revoked
  reason            String?
  updatedBy         Int?      @map("updated_by")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([didId, platform])
  @@index([platform])
  @@map("did_platform_permissions")
}
```

- [ ] **Step 1.8: 新增 DidAuditLog 模型**

```prisma
model DidAuditLog {
  id              Int       @id @default(autoincrement())
  userId          Int?
  didId           Int?
  adminId         Int?
  action          String    // did:create/wallet:bind/kyc:verify/sbt:issue/...
  module          String?   // did/wallets/kyc/sbt/platform-access
  targetType      String?   @map("target_type")
  targetId        String?   @map("target_id")
  beforeData      String?   @map("before_data") // JSON
  afterData       String?   @map("after_data")  // JSON
  reason          String?
  ip              String?
  userAgent       String?   @map("user_agent")
  dataHash        String?   @map("data_hash")
  createdAt       DateTime  @default(now())

  @@index([didId])
  @@index([action])
  @@index([module])
  @@index([createdAt])
  @@map("did_audit_logs")
}
```

- [ ] **Step 1.9: 运行 Prisma 迁移验证**

Run: `cd apps/api && npx prisma generate`
Expected: 无错误，新模型生成成功

- [ ] **Step 1.10: 提交**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(did): add 8 DID database models (DidIdentity/WalletAccount/WalletNonce/KycRecord/SbtCredential/PlatformPermission/DidAuditLog)"
```

---

### Task 2: 实现钱包登录模块 (WalletsModule + Nonce)

**Files:**

- Create: `apps/api/src/modules/wallets/wallets.module.ts`
- Create: `apps/api/src/modules/wallets/wallets.controller.ts`
- Create: `apps/api/src/modules/wallets/wallets.service.ts`
- Create: `apps/api/src/modules/wallets/dto/bind-wallet.dto.ts`
- Create: `apps/api/src/modules/wallets/dto/nonce-response.dto.ts`

- [ ] **Step 2.1: 创建 WalletsService**

```typescript
// apps/api/src/modules/wallets/wallets.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  /** 生成登录/绑定 Nonce */
  async createNonce(walletAddress: string, purpose: string = 'login') {
    const nonce = `WOPC-${purpose}:${randomBytes(16).toString('hex')}`;
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟
    await this.prisma.walletNonce.create({
      data: { walletAddress: walletAddress.toLowerCase(), nonce, purpose, expiredAt },
    });
    return { nonce, expiredAt, walletAddress };
  }

  /** 验证并消费 Nonce */
  async consumeNonce(walletAddress: string, nonce: string, purpose: string = 'login') {
    const record = await this.prisma.walletNonce.findFirst({
      where: { walletAddress: walletAddress.toLowerCase(), nonce, purpose, used: false },
    });
    if (!record) return false;
    if (new Date() > record.expiredAt) {
      await this.prisma.walletNonce.delete({ where: { id: record.id } });
      return false;
    }
    await this.prisma.walletNonce.update({ where: { id: record.id }, data: { used: true } });
    return true;
  }

  /** 绑定钱包 */
  async bindWallet(
    userId: number,
    didId: number,
    data: { walletAddress: string; chainId: string; walletType: string; role: string }
  ) {
    const existing = await this.prisma.walletAccount.findUnique({
      where: {
        walletAddress_chainId: {
          walletAddress: data.walletAddress.toLowerCase(),
          chainId: data.chainId,
        },
      },
    });
    if (existing) throw new BadRequestException('WALLET_ALREADY_BOUND');

    const isPrimary = data.role === 'primary';
    if (isPrimary) {
      await this.prisma.walletAccount.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.walletAccount.create({
      data: {
        userId,
        didId,
        walletAddress: data.walletAddress.toLowerCase(),
        chainId: data.chainId,
        walletType: data.walletType,
        role: data.role,
        isPrimary,
      },
    });
  }

  /** 解绑钱包 */
  async unbindWallet(userId: number, walletAddress: string) {
    const wallet = await this.prisma.walletAccount.findFirst({
      where: { userId, walletAddress: walletAddress.toLowerCase() },
    });
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
    if (wallet.isPrimary) throw new BadRequestException('CANNOT_UNBIND_PRIMARY_WALLET');
    return this.prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { unlinkedAt: new Date(), riskStatus: 'normal' },
    });
  }

  /** 查询用户钱包列表 */
  async listWallets(userId: number) {
    return this.prisma.walletAccount.findMany({ where: { userId, unlinkedAt: null } });
  }
}
```

- [ ] **Step 2.2: 创建 WalletsController**

```typescript
// apps/api/src/modules/wallets/wallets.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('👛 DID 钱包管理')
@Controller('did/wallets')
export class WalletsController {
  constructor(private svc: WalletsService) {}

  @Get('nonce')
  @ApiOperation({ summary: '获取登录Nonce' })
  async getNonce(@Query('walletAddress') walletAddress: string) {
    return { success: true, data: await this.svc.createNonce(walletAddress, 'login') };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bind')
  @ApiOperation({ summary: '绑定钱包' })
  async bindWallet(@Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.svc.bindWallet(user.id, body.didId, body) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':address')
  @ApiOperation({ summary: '解绑钱包' })
  async unbindWallet(@Param('address') address: string, @CurrentUser() user: any) {
    return { success: true, data: await this.svc.unbindWallet(user.id, address) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  @ApiOperation({ summary: '查询钱包列表' })
  async listWallets(@CurrentUser() user: any) {
    return { success: true, data: await this.svc.listWallets(user.id) };
  }
}
```

- [ ] **Step 2.3: 创建 WalletsModule**

```typescript
// apps/api/src/modules/wallets/wallets.module.ts
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
```

- [ ] **Step 2.4: 提交**

```bash
git add apps/api/src/modules/wallets/
git commit -m "feat(did): implement wallet nonce and bind/unbind module"
```

---

### Task 3: 实现钱包签名登录 (AuthService 增强)

**Files:**

- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Install: `ethers` 依赖

- [ ] **Step 3.1: 安装 ethers 依赖**

Run: `cd apps/api && npm install ethers`

- [ ] **Step 3.2: 增强 AuthService — 添加 walletLogin 方法**

```typescript
// 在 apps/api/src/modules/auth/auth.service.ts 中添加:
import { ethers } from 'ethers';
import { JwtService } from '@nestjs/jwt';
import { WalletsService } from '../wallets/wallets.service';

// 在 constructor 中添加:
constructor(
  // ... 原有依赖
  private jwtService: JwtService,
  private walletsService: WalletsService,
  private prisma: PrismaService,
) {}

/** 钱包签名登录 */
async walletLogin(walletAddress: string, nonce: string, signature: string) {
  // 1. 验证签名
  let recoveredAddress: string;
  try {
    recoveredAddress = ethers.verifyMessage(nonce, signature);
  } catch {
    throw new UnauthorizedException('INVALID_SIGNATURE_FORMAT');
  }
  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new UnauthorizedException('SIGNATURE_ADDRESS_MISMATCH');
  }

  // 2. 验证 nonce
  const valid = await this.walletsService.consumeNonce(walletAddress, nonce);
  if (!valid) throw new UnauthorizedException('NONCE_INVALID_OR_EXPIRED');

  // 3. 查询钱包绑定关系
  const wallet = await this.prisma.walletAccount.findFirst({
    where: { walletAddress: walletAddress.toLowerCase(), unlinkedAt: null },
    include: { did: true },
  });
  if (!wallet || !wallet.did) throw new UnauthorizedException('WALLET_NOT_BOUND');
  if (wallet.did.status === 'frozen') throw new UnauthorizedException('DID_FROZEN');
  if (wallet.did.status === 'revoked') throw new UnauthorizedException('DID_REVOKED');

  // 4. 更新最后登录时间
  await this.prisma.walletAccount.update({
    where: { id: wallet.id },
    data: { lastLoginAt: new Date() },
  });

  // 5. 签发 JWT
  const payload = { sub: wallet.userId, did: wallet.did.did, walletAddress, kycStatus: wallet.did.kycStatus };
  const token = await this.jwtService.signAsync(payload, { expiresIn: '24h' });

  return { token, tokenType: 'Bearer', expiresIn: 86400, did: wallet.did.did, userId: wallet.userId, kycStatus: wallet.did.kycStatus, status: wallet.did.status };
}
```

- [ ] **Step 3.3: 添加 wallet-login 路由到 AuthController**

```typescript
// 在 apps/api/src/modules/auth/auth.controller.ts 中添加:
@Post('wallet-login')
@ApiOperation({ summary: '钱包签名登录' })
async walletLogin(@Body() body: { walletAddress: string; nonce: string; signature: string }) {
  const result = await this.authService.walletLogin(body.walletAddress, body.nonce, body.signature);
  return { success: true, data: result };
}
```

- [ ] **Step 3.4: 提交**

```bash
git add apps/api/src/modules/auth/ apps/api/package.json
git commit -m "feat(did): implement wallet signature login (ethers.verifyMessage + JWT)"
```

---

### Task 4: 实现 DID 核心模块 (重写现有 did 模块)

**Files:**

- Rewrite: `apps/api/src/modules/did/did.module.ts`
- Rewrite: `apps/api/src/modules/did/did.controller.ts`
- Rewrite: `apps/api/src/modules/did/did.service.ts`
- Create: `apps/api/src/modules/did/dto/register-did.dto.ts`
- Create: `apps/api/src/modules/did/dto/update-did.dto.ts`

- [ ] **Step 4.1: 安装依赖**

Run: `cd apps/api && npm install @nestjs/jwt`

- [ ] **Step 4.2: 创建 DidService (完整 MVP)**

```typescript
// apps/api/src/modules/did/did.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class DidService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  /** 生成 DID 编号: did:zsdt:U{year}{6位序号} */
  private generateDid(): string {
    const year = new Date().getFullYear();
    const seq = crypto.randomInt(100000, 999999);
    return `did:zsdt:U${year}${seq}`;
  }

  /** 注册 DID */
  async register(data: {
    email?: string;
    phone?: string;
    walletAddress: string;
    sourcePlatform?: string;
  }) {
    const existingWallet = await this.prisma.walletAccount.findFirst({
      where: { walletAddress: data.walletAddress.toLowerCase() },
    });
    if (existingWallet) throw new BadRequestException('WALLET_ALREADY_BOUND');

    // 创建 User
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        userNo: `U${Date.now()}`,
        status: 'active',
      },
    });

    // 创建 DID
    const did = this.generateDid();
    const didIdentity = await this.prisma.didIdentity.create({
      data: {
        userId: user.id,
        did,
        status: 'pending',
        kycStatus: 'unverified',
        primaryWallet: data.walletAddress.toLowerCase(),
      },
    });

    // 绑定主钱包
    await this.prisma.walletAccount.create({
      data: {
        userId: user.id,
        didId: didIdentity.id,
        walletAddress: data.walletAddress.toLowerCase(),
        chainId: '1',
        walletType: 'metamask',
        isPrimary: true,
        role: 'primary',
      },
    });

    // 初始化四平台权限
    const platforms = ['portal', 'ecommerce', 'exchange', 'gaming'];
    await this.prisma.platformPermission.createMany({
      data: platforms.map((p) => ({
        userId: user.id,
        didId: didIdentity.id,
        platform: p,
        allowed: false,
        permissionStatus: 'pending',
      })),
    });

    return { userId: user.id, did: didIdentity.did, status: didIdentity.status };
  }

  /** 按 DID 查询 */
  async findByDid(did: string) {
    const record = await this.prisma.didIdentity.findUnique({
      where: { did },
      include: {
        user: true,
        wallets: { where: { unlinkedAt: null } },
        credentials: true,
        permissions: true,
      },
    });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    return record;
  }

  /** DID 列表 (管理后台) */
  async list(query: any) {
    const { page = 1, pageSize = 20, status, kycStatus, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (kycStatus) where.kycStatus = kycStatus;
    if (search)
      where.OR = [{ did: { contains: search } }, { user: { email: { contains: search } } }];
    const [data, total] = await Promise.all([
      this.prisma.didIdentity.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, userNo: true } } },
      }),
      this.prisma.didIdentity.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  /** 冻结 DID */
  async freezeDID(did: string, reason: string, adminId: number) {
    const record = await this.prisma.didIdentity.findUnique({ where: { did } });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    if (record.status === 'frozen') throw new BadRequestException('ALREADY_FROZEN');
    return this.prisma.didIdentity.update({
      where: { did },
      data: { status: 'frozen', frozenAt: new Date() },
    });
  }

  /** 解冻 DID */
  async unfreezeDID(did: string, reason: string, adminId: number) {
    const record = await this.prisma.didIdentity.findUnique({ where: { did } });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    if (record.status !== 'frozen') throw new BadRequestException('NOT_FROZEN');
    return this.prisma.didIdentity.update({
      where: { did },
      data: { status: 'active', frozenAt: null },
    });
  }

  /** 统计 */
  async stats() {
    const [total, active, frozen, revoked, verifiedKyc] = await Promise.all([
      this.prisma.didIdentity.count(),
      this.prisma.didIdentity.count({ where: { status: 'active' } }),
      this.prisma.didIdentity.count({ where: { status: 'frozen' } }),
      this.prisma.didIdentity.count({ where: { status: 'revoked' } }),
      this.prisma.didIdentity.count({ where: { kycStatus: 'verified' } }),
    ]);
    return { total, active, frozen, revoked, verifiedKyc };
  }
}
```

- [ ] **Step 4.3: 创建 DID Controller (完整 MVP)**

```typescript
// apps/api/src/modules/did/did.controller.ts
import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DidService } from './did.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('🆔 DID 数字身份')
@Controller('did')
export class DidController {
  constructor(private svc: DidService) {}

  @Post('register')
  @ApiOperation({ summary: '注册DID' })
  async register(@Body() body: { email?: string; phone?: string; walletAddress: string }) {
    return { success: true, data: await this.svc.register(body) };
  }

  @Get()
  @ApiOperation({ summary: 'DID列表 (管理)' })
  async list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'DID统计' })
  async stats() {
    return this.svc.stats();
  }

  @Get(':did')
  @ApiOperation({ summary: '查询DID详情' })
  async detail(@Param('did') did: string) {
    return { success: true, data: await this.svc.findByDid(did) };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':did/freeze')
  @ApiOperation({ summary: '冻结DID' })
  async freeze(
    @Param('did') did: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any
  ) {
    return { success: true, data: await this.svc.freezeDID(did, reason, user?.id || 0) };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':did/unfreeze')
  @ApiOperation({ summary: '解冻DID' })
  async unfreeze(
    @Param('did') did: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any
  ) {
    return { success: true, data: await this.svc.unfreezeDID(did, reason, user?.id || 0) };
  }
}
```

- [ ] **Step 4.4: 提交**

```bash
git add apps/api/src/modules/did/
git commit -m "feat(did): implement DID core module (register/query/freeze/unfreeze)"
```

---

### Task 5: 实现 KYC + SBT + 平台权限 + 审计日志模块

**Files:**

- Create: `apps/api/src/modules/kyc/kyc.module.ts`, `kyc.controller.ts`, `kyc.service.ts`
- Create: `apps/api/src/modules/sbt/sbt.module.ts`, `sbt.controller.ts`, `sbt.service.ts`
- Create: `apps/api/src/modules/platform-access/platform-access.module.ts`, `platform-access.controller.ts`, `platform-access.service.ts`
- Modify: `apps/api/src/app.module.ts` (注册所有新模块)

- [ ] **Step 5.1: 实现 KYC 模块**

Create `apps/api/src/modules/kyc/kyc.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async submit(
    userId: number,
    data: {
      didId: number;
      fullName: string;
      documentType: string;
      documentNo: string;
      country: string;
    }
  ) {
    const hash = crypto
      .createHash('sha256')
      .update(`${data.documentNo}:${Date.now()}`)
      .digest('hex');
    const record = await this.prisma.kycRecord.create({
      data: {
        userId,
        didId: data.didId,
        kycStatus: 'pending',
        fullNameEncrypted: data.fullName,
        documentType: data.documentType,
        documentNoEncrypted: data.documentNo,
        country: data.country,
        resultHash: hash,
      },
    });
    // 更新 DID kyc_status
    await this.prisma.didIdentity.update({
      where: { id: data.didId },
      data: { kycStatus: 'pending' },
    });
    return record;
  }

  async approve(recordId: number, reviewerId: number) {
    const record = await this.prisma.kycRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('KYC_RECORD_NOT_FOUND');
    await this.prisma.kycRecord.update({
      where: { id: recordId },
      data: { kycStatus: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    // 激活 DID + 标记 kyc 通过
    await this.prisma.didIdentity.update({
      where: { id: record.didId },
      data: { kycStatus: 'verified', status: 'active', activatedAt: new Date() },
    });
    return { success: true, status: 'approved' };
  }

  async reject(recordId: number, reviewerId: number, reason: string) {
    await this.prisma.kycRecord.update({
      where: { id: recordId },
      data: {
        kycStatus: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    return { success: true, status: 'rejected' };
  }

  async status(userId: number) {
    const record = await this.prisma.kycRecord.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return { kycStatus: 'unverified' };
    return {
      kycStatus: record.kycStatus,
      provider: record.provider,
      submittedAt: record.createdAt,
    };
  }

  async queue(query: any) {
    const { page = 1, pageSize = 20, status } = query;
    const where: any = {};
    if (status) where.kycStatus = status;
    const [data, total] = await Promise.all([
      this.prisma.kycRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, userNo: true } } },
      }),
      this.prisma.kycRecord.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }
}
```

Create `apps/api/src/modules/kyc/kyc.controller.ts` (4 endpoints: submit/approve/reject/status/queue)

Create `apps/api/src/modules/kyc/kyc.module.ts`

- [ ] **Step 5.2: 实现 SBT 模块**

Create `apps/api/src/modules/sbt/sbt.service.ts`:

```typescript
// 核心方法: issue/revoke/list
// issue: 创建 SbtCredential 记录 (链下模式, MVP暂不调真实合约)
// revoke: 标记 status = revoked
// list: 按 userId 或 didId 查询
```

- [ ] **Step 5.3: 实现 PlatformAccess 模块**

Create `apps/api/src/modules/platform-access/platform-access.service.ts`:

```typescript
// checkAccess(did, platform): 查询 PlatformPermission 表 + DID 状态
// 返回: { allowed, kycStatus, riskLevel, memberLevel, permissions: {...} }
```

- [ ] **Step 5.4: 注册所有新模块到 app.module.ts**

Modify `apps/api/src/app.module.ts`:

```typescript
import { DidModule } from './modules/did/did.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { KycModule } from './modules/kyc/kyc.module';
import { SbtModule } from './modules/sbt/sbt.module';
import { PlatformAccessModule } from './modules/platform-access/platform-access.module';

// 在 imports 数组中加入:
DidModule, WalletsModule, KycModule, SbtModule, PlatformAccessModule,
```

- [ ] **Step 5.5: 编译验证**

Run: `cd apps/api && npm run start:dev`
Wait 15s then check output for "Found 0 errors"
Expected: NestJS 启动成功，所有 DID 路由注册

- [ ] **Step 5.6: 提交**

```bash
git add apps/api/src/modules/kyc/ apps/api/src/modules/sbt/ apps/api/src/modules/platform-access/ apps/api/src/app.module.ts
git commit -m "feat(did): implement KYC/SBT/PlatformAccess audit modules + register in app.module"
```

---

### Task 6: 增强管理后台 DID 页面 (React)

**Files:**

- Rewrite: `apps/admin-web/src/pages/did/List.tsx`
- Rewrite: `apps/admin-web/src/pages/did/Issue.tsx`
- Rewrite: `apps/admin-web/src/pages/did/Cards.tsx`

- [ ] **Step 6.1: 重写 DID 列表页 (List.tsx)**

目标：完整的 DID 管理列表，包含：

- 统计卡片 (总DID/活跃/冻结/已认证KYC)
- 搜索框 (按 DID / 邮箱)
- 状态筛选 (全部/活跃/冻结/已吊销)
- 表格列: ID, DID, 用户, KYC状态, DID状态, 风险等级, 主钱包, 创建时间, 操作
- 操作按钮: 冻结/解冻/详情

- [ ] **Step 6.2: 重写签发管理页 (Issue.tsx)**

目标：KYC 审核队列 + SBT 签发

- Tab 切换: KYC 审核 | SBT 签发
- KYC 审核: 待审列表 + 通过/驳回按钮
- SBT 签发: 选择用户 + 选择凭证类型 + 签发按钮

- [ ] **Step 6.3: 重写名片管理页 (Cards.tsx)**

目标：关联 DID 身份的名片管理

- 名片列表 (对接 BusinessCard 表)
- 关联 DID 显示
- 生成/编辑名片

- [ ] **Step 6.4: 编译验证 admin-web**

Run: `cd apps/admin-web && npx vite build 2>&1 | tail -20`
Expected: 构建成功，无类型错误

- [ ] **Step 6.5: 提交**

```bash
git add apps/admin-web/src/pages/did/
git commit -m "feat(did): enhance admin-web DID management pages (List/Issue/Cards)"
```

---

### Task 7: 编译全量验证 + 浏览器测试

**Files:** 无修改，纯验证

- [ ] **Step 7.1: 停止所有运行中的服务**

Run: `taskkill /F /IM node.exe` (谨慎使用，或逐个停止)

- [ ] **Step 7.2: 重新编译 API**

Run: `cd apps/api && npm run start:dev`
Wait for "Found 0 errors" + "Nest application successfully started"

- [ ] **Step 7.3: 编译 admin-web**

Run: `cd apps/admin-web && npx vite build`
Expected: 构建成功

- [ ] **Step 7.4: 浏览器测试 API 端点**

使用浏览器访问:

- `GET http://localhost:3001/api/did/stats` — 应返回 DID 统计数据
- `POST http://localhost:3001/api/did/register` — 测试注册 (需 body)
- `GET http://localhost:3001/api-docs` — Swagger 文档应包含 DID 分组

- [ ] **Step 7.5: 提交最终验证**

```bash
git add -A
git commit -m "chore: full compile verification passed - DID MVP API + admin-web"
```

---

### Task 8: n8n 工作流 Webhook + BPM 审批桩代码 (预留)

**Files:**

- Create: `apps/api/src/modules/did/did-n8n-webhooks.controller.ts`
- Create: `apps/api/src/modules/did/did-bpm-stubs.service.ts`

- [ ] **Step 8.1: 创建 n8n Webhook 端点**

```typescript
// 4个 Webhook: DID_CREATED / KYC_VERIFIED / RISK_ALERT / SHOULD_ISSUE_SBT
// 每个返回 200 + 触发对应业务流程
```

- [ ] **Step 8.2: 创建 BPM 审批桩代码**

```typescript
// 4个审批流程: KYC复核 / DID冻结 / DID解冻 / SBT撤销
// 每个返回: { processId, status: 'created' }
```

- [ ] **Step 8.3: 提交**

```bash
git add apps/api/src/modules/did/
git commit -m "feat(did): add n8n webhook endpoints and BPM stub service"
```

---

## 验证清单

1. ✅ Prisma generate 通过 0 错误
2. ✅ API 编译 0 错误
3. ✅ admin-web 编译 0 错误
4. ✅ API 路由全部注册 (`/api/did/*`, `/api/did/wallets/*`, `/api/did/kyc/*`, `/api/did/sbt/*`, `/api/did/platform-access`)
5. ✅ POST `/api/did/register` 返回 201
6. ✅ GET `/api/did/stats` 返回统计数据
7. ✅ Swagger 文档 `/api-docs` 包含 DID 分组
8. ✅ admin-web DID 列表页可正常渲染
9. ✅ admin-web KYC 审核页面可操作
10. ✅ 全部变更已 Git 提交

---

## 错误处理约定

所有 DID API 统一错误格式:

```json
{
  "success": false,
  "error": {
    "code": "DID_NOT_FOUND",
    "message": "指定的DID不存在"
  },
  "timestamp": "2026-06-09T18:40:00Z"
}
```

关键错误码列表:
| HTTP | 错误码 | 场景 |
|------|--------|------|
| 404 | DID_NOT_FOUND | 查询不存在的 DID |
| 400 | WALLET_ALREADY_BOUND | 钱包已被绑定 |
| 401 | INVALID_SIGNATURE | 签名验证失败 |
| 401 | NONCE_EXPIRED | Nonce 已过期 |
| 403 | DID_FROZEN | DID 已被冻结 |
| 403 | DID_REVOKED | DID 已撤销 |
| 403 | KYC_REQUIRED | 需要先完成 KYC |
| 429 | RATE_LIMITED | 请求过于频繁 |
