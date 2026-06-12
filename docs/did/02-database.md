# 02 - 数据库设计

> **来源**: MVP版本-DID制作文档.md (第1914~2183行)
> **数据库**: PostgreSQL + Prisma ORM
> **状态**: Schema定稿

---

## 表总览

| #   | 表名                     | 说明        | 关键字段                                |
| --- | ------------------------ | ----------- | --------------------------------------- |
| 1   | users                    | 用户基础表  | user_no, email, phone, risk_level       |
| 2   | did_identities           | DID身份表   | did, status, kyc_status, primary_wallet |
| 3   | wallet_accounts          | 钱包账户表  | wallet_address, chain_id, is_primary    |
| 4   | wallet_nonces            | 登录Nonce表 | wallet_address, nonce, expired_at       |
| 5   | kyc_records              | KYC记录表   | provider, kyc_status, result_hash       |
| 6   | sbt_credentials          | SBT凭证表   | credential_type, token_id, status       |
| 7   | did_platform_permissions | 平台权限表  | platform, allowed, permission_status    |
| 8   | did_audit_logs           | 审计日志表  | action, module, before_data, after_data |

---

## 1. users 用户表

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_no VARCHAR(64) UNIQUE NOT NULL,       -- 用户编号 U202600000001
    email VARCHAR(128),
    phone VARCHAR(32),
    password_hash VARCHAR(255),                 -- 可选（非钱包登录用）
    status VARCHAR(32) DEFAULT 'active',        -- active/inactive/banned
    risk_level VARCHAR(32) DEFAULT 'low',       -- low/medium/high/critical
    country VARCHAR(64),                        -- 注册国家
    source_platform VARCHAR(64),                -- 来源平台 portal/ecommerce/exchange/gaming
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_user_no ON users(user_no);
```

---

## 2. did_identities DID身份表

```sql
CREATE TABLE did_identities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128) UNIQUE NOT NULL,            -- did:zsdt:U202600000001
    did_method VARCHAR(64) NOT NULL DEFAULT 'zsdt',
    status VARCHAR(32) DEFAULT 'pending',         -- pending/created/kyc_pending/verified/active/restricted/frozen/revoked/deactivated
    kyc_status VARCHAR(32) DEFAULT 'unverified', -- unverified/pending/verified/rejected
    aml_status VARCHAR(32) DEFAULT 'unchecked',  -- unchecked/pending/cleared/suspicious
    risk_level VARCHAR(32) DEFAULT 'low',
    member_level VARCHAR(32) DEFAULT 'standard',  -- standard/gold/platinum/diamond
    primary_wallet VARCHAR(128),
    credential_hash VARCHAR(255),                -- 整体凭证哈希
    chain_tx_hash VARCHAR(255),                  -- 链上注册交易Hash
    activated_at TIMESTAMP,
    frozen_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_did_user_id ON did_identities(user_id);
CREATE INDEX idx_did_status ON did_identities(status);
CREATE INDEX idx_did_kyc_status ON did_identities(kyc_status);
CREATE INDEX idx_did_primary_wallet ON did_identities(primary_wallet);
CREATE INDEX idx_did_did ON did_identities(did);
```

---

## 3. wallet_accounts 钱包账户表

```sql
CREATE TABLE wallet_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128),
    wallet_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) NOT NULL,               -- 1=ETH, 56=BSC, 137=MATIC, etc.
    wallet_type VARCHAR(64),                     -- metamask/okx/binance/trust/etc.
    is_primary BOOLEAN DEFAULT FALSE,            -- 是否主钱包
    role VARCHAR(32) DEFAULT 'primary',          -- primary/backup/payment/exchange/ecommerce/gaming
    risk_status VARCHAR(32) DEFAULT 'normal',    -- normal/suspicious/blocked
    signature_nonce VARCHAR(255),               -- 当前有效nonce
    linked_at TIMESTAMP DEFAULT NOW(),
    unlinked_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(wallet_address, chain_id)
);

-- 索引
CREATE INDEX idx_wallet_user_id ON wallet_accounts(user_id);
CREATE INDEX idx_wallet_did ON wallet_accounts(did);
CREATE INDEX idx_wallet_address ON wallet_accounts(wallet_address);
CREATE INDEX idx_wallet_chain ON wallet_accounts(chain_id);
```

---

## 4. wallet_nonces 钱包登录Nonce表

```sql
CREATE TABLE wallet_nonces (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) DEFAULT 'login',          -- login/bind/unbind
    expired_at TIMESTAMP NOT NULL,               -- 通常5分钟过期
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_nonce_address ON wallet_nonces(wallet_address);
CREATE INDEX idx_nonce_value ON wallet_nonces(nonce);
CREATE INDEX idx_nonce_expired ON wallet_nonces(expired_at);

-- 定期清理过期nonce的Job建议: 每小时清理一次
```

---

## 5. kyc_records KYC记录表

```sql
CREATE TABLE kyc_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128),
    provider VARCHAR(64),                        -- manual/onfido/sumsub/jumio/custom
    kyc_status VARCHAR(32) DEFAULT 'pending',   -- pending/reviewing/approved/rejected/expired
    full_name_encrypted TEXT,                    -- 加密存储
    document_type VARCHAR(64),                   -- passport/id_card/drivers_license
    document_no_encrypted TEXT,                  -- 加密存储
    birth_date_encrypted TEXT,                   -- 加密存储
    country VARCHAR(64),
    address_encrypted TEXT,                      -- 加密存储
    verification_result JSONB,                   -- 第三方返回的原始结果
    result_hash VARCHAR(255),                    -- SHA256 hash of verification data
    rejection_reason TEXT,
    reviewed_by BIGINT,                          -- 审核员ID
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_kyc_user_id ON kyc_records(user_id);
CREATE INDEX idx_kyc_did ON kyc_records(did);
CREATE INDEX idx_kyc_status ON kyc_records(kyc_status);
CREATE INDEX idx_kyc_provider ON kyc_records(provider);
```

---

## 6. sbt_credentials SBT凭证表

```sql
CREATE TABLE sbt_credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128) NOT NULL,
    wallet_address VARCHAR(128) NOT NULL,
    contract_address VARCHAR(128),              -- SBT合约地址
    token_id VARCHAR(128),                       -- 链上Token ID
    credential_type VARCHAR(64) NOT NULL,        -- KYC_VERIFIED/MEMBER/VIP/MERCHANT/...
    credential_level VARCHAR(64),                -- standard/gold/platinum
    chain_id VARCHAR(32),
    status VARCHAR(32) DEFAULT 'active',         -- active/revoked/expired
    tx_hash VARCHAR(255),                        -- 链上mint交易Hash
    metadata_uri TEXT,                           -- Token URI / 元数据链接
    issued_by BIGINT,                             -- 签发管理员ID
    issued_at TIMESTAMP DEFAULT NOW(),
    revoked_by BIGINT,
    revoked_at TIMESTAMP,
    revoke_reason TEXT
);

-- 索引
CREATE INDEX idx_sbt_user_id ON sbt_credentials(user_id);
CREATE INDEX idx_sbt_did ON sbt_credentials(did);
CREATE INDEX idx_sbt_wallet ON sbt_credentials(wallet_address);
CREATE INDEX idx_sbt_type ON sbt_credentials(credential_type);
CREATE INDEX idx_sbt_status ON sbt_credentials(status);
```

---

## 7. did_platform_permissions 平台权限表

```sql
CREATE TABLE did_platform_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128) NOT NULL,
    platform VARCHAR(64) NOT NULL,               -- portal/ecommerce/exchange/gaming
    allowed BOOLEAN DEFAULT FALSE,
    permission_status VARCHAR(32) DEFAULT 'pending', -- pending/approved/denied/revoked
    reason TEXT,
    updated_by BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(did, platform)
);

-- 索引
CREATE INDEX idx_platform_permissions_did ON did_platform_permissions(did);
CREATE INDEX idx_platform_permissions_platform ON did_platform_permissions(platform);
CREATE INDEX idx_platform_permissions_allowed ON did_platform_permissions(allowed);
```

---

## 8. did_audit_logs 审计日志表

```sql
CREATE TABLE did_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,                               -- 操作对象用户（可为空，如系统操作）
    did VARCHAR(128),
    admin_id BIGINT,                              -- 操作者管理员ID
    action VARCHAR(128) NOT NULL,                 -- did:create/wallet:bind/kyc:verify/sbt:issue/...
    module VARCHAR(64),                           -- did/wallets/kyc/sbt/platform-access/audit
    target_type VARCHAR(64),                      -- user/wallet/credential/permission
    target_id VARCHAR(128),
    before_data JSONB,                            -- 操作前快照
    after_data JSONB,                             -- 操作后快照
    reason TEXT,                                  -- 操作原因
    ip VARCHAR(64),
    user_agent TEXT,
    data_hash VARCHAR(255),                       -- 本条日志的SHA256 Hash
    chain_tx_hash VARCHAR(255),                  -- 如果上链则记录tx
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_audit_did ON did_audit_logs(did);
CREATE INDEX idx_audit_action ON did_audit_logs(action);
CREATE INDEX idx_audit_module ON did_audit_logs(module);
CREATE INDEX idx_audit_created ON did_audit_logs(created_at);
CREATE INDEX idx_audit_admin ON did_audit_logs(admin_id);
CREATE INDEX idx_audit_user ON did_audit_logs(user_id);

-- 建议分区: 按月分区，审计日志量大
```

---

## ER关系图

```
users (1) ────< (N) did_identities
  │                  │
  │                  ├──< (1) primary_wallet ──── wallet_accounts
  │                  │
  │                  ├──< (N) kyc_records
  │                  │
  │                  ├──< (N) sbt_credentials
  │                  │
  │                  ├──< (N) did_platform_permissions
  │                  │
  │                  └──< (N) did_audit_logs
  │
  └──────────────< (N) wallet_accounts

wallet_accounts (1) ───< (N) wallet_nonces
```

---

## Prisma Schema 参考

```prisma
// 以下为Prisma schema.prisma关键模型定义参考

model User {
  id          Int       @id @default(autoincrement())
  userNo      String    @unique @map("user_no")
  email       String?
  phone       String?
  status      String    @default("active")
  riskLevel   String    @default("low")
  country     String?
  sourcePlatform String? @map("source_platform")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // 关系
  didIdentities     DidIdentity[]
  walletAccounts    WalletAccount[]
  kycRecords        KycRecord[]
  sbtCredentials    SbtCredential[]
  platformPermissions PlatformPermission[]
  auditLogs         DidAuditLog[]

  @@map("users")
}

model DidIdentity {
  id              Int      @id @default(autoincrement())
  userId          Int
  did             String   @unique
  didMethod       String   @default("zsdt") @map("did_method")
  status          String   @default("pending")
  kycStatus       String   @default("unverified") @map("kyc_status")
  amlStatus       String   @default("unchecked") @map("aml_status")
  riskLevel       String   @default("low") @map("risk_level")
  memberLevel     String   @default("standard") @map("member_level")
  primaryWallet   String?  @map("primary_wallet")
  credentialHash  String?  @map("credential_hash")
  chainTxHash     String?  @map("chain_tx_hash")
  activatedAt     DateTime? @map("activated_at")
  frozenAt        DateTime? @map("frozen_at")
  revokedAt       DateTime? @map("revoked_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id])
  wallets         WalletAccount[]
  kycRecords      KycRecord[]
  credentials     SbtCredential[]
  permissions     PlatformPermission[]
  auditLogs       DidAuditLog[]

  @@index([userId])
  @@index([status])
  @@index([kycStatus])
  @@map("did_identities")
}

// ... 其余模型类似定义
```

---

_下一节_: [03-contracts.md](./03-contracts.md) — 智能合约代码
