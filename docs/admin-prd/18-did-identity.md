# 18 · DID 身份（链上身份 · 凭证 · 验证）

> **对应 H5**：`/did-identity`（DID 身份）
> **核心目标**：管理去中心化身份（DID）注册、凭证签发/吊销、验证记录。

---

## 1. 业务目标

- W3C DID 标准实现
- 可验证凭证（VC）签发/吊销/查询
- 链上锚定（可选）
- 验证日志审计

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为超管，我签发「萨摩亚公司注册」凭证给用户 |
| US-2 | 作为风控，我吊销某用户的「KYC 通过」凭证 |
| US-3 | 作为客服，我查某 DID 的全部凭证 |
| US-4 | 作为运营，我看凭证类型使用率 |

## 3. 字段定义

### 3.1 DidIdentity（DID 主体）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| did | String(120) | ✓ | 唯一 did:web:... 或 did:eth:... |
| method | String(40) | ✓ | `web` / `ethr`（**MVP 范围**；`key` / `ion` 列入 v2，见 §3.1.1） |
| userId | String | | 关联用户 |
| controllerKey | String | | 控制器公钥 |
| document | Text | | DID Document JSON |
| status | enum | ✓ | `active` / `deactivated` / `rotated` |
| createdAt, updatedAt, deletedAt, version | | | 通用 |

#### 3.1.1 MVP 仅支持 web / ethr（Q6 修复）

> **为什么需要这章**：原 §3.1 字段说明列了 4 种 method（`web / ethr / key / ion`），但 §11.1 链选型表全是 EVM 网络、§11.2 KMS 私钥托管只针对 ethr——**`did:key`（自管理密钥，无链）和 `did:ion`（比特币 Sidetree，与 EVM 无关）的完整实现路径完全缺失**。本节明确 MVP 范围。

**MVP 支持**：
- ✅ `did:web`：基于域名的 DID 解析（部署文档到 `https://<domain>/.well-known/did.json`），无链上交互
- ✅ `did:ethr`：基于以太坊地址的 DID（`did:ethr:<chainId>:<address>`），私钥由 AWS KMS 托管（§11.2）

**v2 计划**（本期不实现，仅在 enum 中预留）：
- ⏸ `did:key`：自管理密钥对（Ed25519 / secp256k1），无链上锚定，私钥在用户钱包
- ⏸ `did:ion`：比特币 Sidetree 协议，需部署 ion node + bitcoin RPC，复杂度高

**校验逻辑**（后端 Service）：
```typescript
function validateDidMethod(method: string): boolean {
  return ['web', 'ethr'].includes(method);  // MVP 校验
}
function validateDidString(did: string, method: string): boolean {
  if (method === 'web') return /^did:web:[a-z0-9.-]+(:[a-zA-Z0-9._-]+)*$/.test(did);
  if (method === 'ethr') return /^did:ethr:(0x)?[0-9a-fA-F]{40}$/.test(did) || /^did:ethr:[0-9]+:0x[0-9a-fA-F]{40}$/.test(did);
  throw new BusinessException('UNSUPPORTED_DID_METHOD', `Method ${method} not in MVP scope`);
}
```

**链上锚定限制**（`chainAnchored=true` 时）：
- 仅 `did:ethr` 可锚定（`did:web` 不需要链上存证）
- 锚定网络必须是 EVM 链（§11.1 6 个之一）
- `did:ion` 走比特币，**不**走 EVM 锚定

**验收用例（DID method 范围）**：
| # | 用例 | 期望 |
|---|---|---|
| 1 | 创建 `method=web` 的 DID | 成功，document 部署到域 |
| 2 | 创建 `method=ethr` 的 DID | 成功，私钥在 KMS 托管 |
| 3 | 创建 `method=key` 的 DID | 422 UNSUPPORTED_DID_METHOD |
| 4 | 创建 `method=ion` 的 DID | 422 UNSUPPORTED_DID_METHOD |
| 5 | 锚定 `did:web` 到链上 | 422 WEB_DID_NOT_ANCHORABLE |
| 6 | 锚定 `did:ethr` 到 polygon | 成功，写 chainAnchored=true |

### 3.2 VerifiableCredential（凭证）
| 字段 | 类型 | 必填 | 说明 |
| id | String | ✓ | |
| vcId | String(120) | ✓ | 唯一 |
| issuerDid | String | ✓ | 签发方 DID |
| subjectDid | String | ✓ | 主体 DID |
| type | String(60) | ✓ | `KYC` / `CompanyRegistration` / `BankAccount` / `TaxResidency` / ... |
| credentialSubject | Text | ✓ | JSON 主体信息 |
| issuanceDate | DateTime | ✓ | 签发时间 |
| expirationDate | DateTime | | 到期 |
| proof | Text | | 签名 proof JSON |
| status | enum | ✓ | `issued` / `revoked` / `expired` / `suspended` |
| revokedAt | DateTime | | |
| revokedBy | String | | adminUserId |
| revokedReason | String | | |
| **链上锚定字段** | | | （仅当 `chainAnchored=true` 时填） |
| chainAnchored | Boolean | | 是否上链 |
| anchorNetwork | String(40) | | `ethereum-mainnet` / `ethereum-sepolia` / `polygon-mainnet` / `arbitrum-mainnet` / `base-mainnet` / `bsc-mainnet` |
| anchorChainId | Int | | 1 / 11155111 / 137 / 42161 / 8453 / 56 |
| anchorTxHash | String(80) | | 0x 开头的 tx hash |
| anchorContractAddress | String(80) | | 锚定合约地址 |
| anchorBlockNumber | Int | | 区块号 |
| anchorGasUsed | Decimal | | 实际 gas（ETH/原生币计价） |
| anchoredAt | DateTime | | 上链时间 |
| anchorRetryCount | Int | | 重试次数 |
| anchorError | String | | 上链失败原因 |
| createdBy, createdAt, updatedAt | | | 通用 |

### 3.3 VerificationLog（验证日志）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| vcId | String | |
| verifierDid | String | 验证方 DID |
| subjectDid | String | |
| result | enum | `valid` / `invalid` / `expired` / `revoked` |
| reason | String | |
| ipAddress | String | |
| createdAt | DateTime | |

### 3.4 CredentialTemplate（凭证模板）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| type | String | 唯一 |
| name | String | |
| description | String | |
| schema | Text | JSON Schema |
| requiredFields | String | JSON |
| issuerDid | String | 默认签发方 |
| validityDays | Int | 有效天数 |
| enabled | Boolean | |
| createdAt, updatedAt, deletedAt | | |

## 4. 状态机

**VC**：
```
issued → revoked
       ↘ expired
       ↘ suspended → issued（恢复）
```

## 5. Prisma 模型

```prisma
model DidIdentity {
  id            String   @id @default(uuid())
  did           String   @unique
  method        String
  userId        String?
  user          User?    @relation("DidIdentityUser", fields: [userId], references: [id], onDelete: Restrict)
  controllerKey String?
  document      String
  status        String   @default("active")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  version       Int      @default(0)

  @@index([userId])
  @@index([status, deletedAt])
}

// 跨文件模型关系补丁（User 主模型见 05-profile.md §5）
// 需在 User 模型内追加：
//   didIdentities DidIdentity[] @relation("DidIdentityUser")
// 并在 User 顶部 `model User {` 行末尾加 `@@index([kycStatus])`（若尚未存在）

model VerifiableCredential {
  id              String    @id @default(uuid())
  vcId            String    @unique
  issuerDid       String
  subjectDid      String
  type            String
  credentialSubject String
  issuanceDate    DateTime  @default(now())
  expirationDate  DateTime?
  proof           String?
  status          String    @default("issued")
  revokedAt       DateTime?
  revokedBy       String?
  revokedReason   String?

  // 链上锚定（Q9 修复）
  chainAnchored         Boolean   @default(false)
  anchorNetwork         String?   // ethereum-mainnet / ethereum-sepolia / polygon-mainnet / arbitrum-mainnet / base-mainnet / bsc-mainnet
  anchorChainId         Int?
  anchorTxHash          String?
  anchorContractAddress String?
  anchorBlockNumber     Int?
  anchorGasUsed         Decimal?
  anchoredAt            DateTime?
  anchorRetryCount      Int       @default(0)
  anchorError           String?

  createdBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([subjectDid, type])
  @@index([issuerDid, type])
  @@index([status, expirationDate])
  @@index([chainAnchored, anchoredAt])
  @@index([anchorTxHash])
}

model VerificationLog {
  id           String   @id @default(uuid())
  vcId         String
  verifierDid  String
  subjectDid   String
  result       String
  reason       String?
  ipAddress    String?
  createdAt    DateTime @default(now())

  @@index([vcId, createdAt])
}

model CredentialTemplate {
  id            String   @id @default(uuid())
  type          String   @unique
  name          String
  description   String?
  schema        String
  requiredFields String? // JSON
  issuerDid     String?
  validityDays  Int      @default(365)
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}
```

## 6. API 接口

### 6.1 DID 主体
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/did/identities` | `did:read` | 列表 |
| GET | `/api/admin/did/identities/:did` | | 详情（含所有凭证） |
| POST | `/api/admin/did/identities` | `did:write` | 创建 |
| POST | `/api/admin/did/identities/:did/deactivate` | `did:write` | 停用 |
| GET | `/api/admin/did/identities/:did/document` | `did:read` | DID Document |

### 6.2 凭证
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/did/credentials` | `did:read` | 列表（subjectDid/type/status） |
| GET | `/api/admin/did/credentials/:vcId` | | 详情 |
| POST | `/api/admin/did/credentials` | `did:credentials:issue` | 签发 |
| POST | `/api/admin/did/credentials/:vcId/revoke` | `did:credentials:revoke` | 吊销（reason 必填） |
| POST | `/api/admin/did/credentials/:vcId/suspend` | `did:credentials:revoke` | 暂停 |
| POST | `/api/admin/did/credentials/:vcId/verify` | `did:read` | 验证（test） |
| GET | `/api/admin/did/credentials/export` | `did:export` | 导出 |

### 6.3 模板
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/did/credential-templates` | `did:read` | 列表 |
| POST | `/api/admin/did/credential-templates` | `did:credentials:issue` | 新增 |
| PUT | `/api/admin/did/credential-templates/:id` | `did:credentials:issue` | 编辑 |
| DELETE | `/api/admin/did/credential-templates/:id` | `did:credentials:issue` | 软删 |

### 6.4 验证日志
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/did/verification-logs` | `did:read` | 列表 |
| GET | `/api/admin/did/verification-logs/export` | `did:export` | 导出 |

### 6.5 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/did/me` | 我的 DID |
| GET | `/api/h5/did/me/credentials` | 我的凭证 |
| POST | `/api/h5/did/verify/:vcId` | 验证（外部凭证） |
| POST | `/api/h5/did/share/:vcId` | 生成分享链接 |

## 7. UI 组件

### 7.1 DID 列表
- 表格：DID / 方法 / 关联用户 / 状态 / 创建时间
- 详情：document 折叠 + 凭证时间线

### 7.2 凭证列表
- 筛选：subjectDid / type / status / 时间
- 列：vcId / 类型 / 主体 / 签发方 / 状态 / 签发时间 / 到期 / 操作
- 批量：批量吊销

### 7.3 签发向导
- 选模板 → 选主体 DID → 填 subject → 预览 → 签发
- 二维码 / 链接分享

### 7.4 验证工具
- 输入 vcId / 二维码
- 显示验证结果 + 详情

## 8. 权限

| 操作 | operator | risk | superadmin |
|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ |
| 签发 | ✗ | ✓ | ✓ |
| 吊销 | ✗ | ✓ | ✓ |
| 模板 | ✗ | ✓ | ✓ |
| 导出 | ✓ | ✓ | ✓ |

## 9. i18n

```json
{
  "did": {
    "title": "DID 身份",
    "vcType": {
      "KYC": "实名认证凭证",
      "CompanyRegistration": "公司注册凭证",
      "BankAccount": "银行账户凭证",
      "TaxResidency": "税务居民凭证"
    },
    "vcStatus": {
      "issued": "已签发",
      "revoked": "已吊销",
      "expired": "已过期",
      "suspended": "已暂停"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 给用户签发 KYC 凭证 | vcId 创建，subjectDid 写入 |
| 2 | 验证该凭证 | result=valid |
| 3 | 吊销凭证 | status=revoked |
| 4 | 验证已吊销凭证 | result=revoked |
| 5 | 凭证到期 | 定时任务 status=expired |
| 6 | DID Document 拉取 | 返回标准 JSON-LD |
| 7 | 分享链接 24h 过期 | |
| 8 | 链上锚定（ETH） | txHash 记录 |
| 9 | 模板必填字段缺失 | 校验失败 |
| 10 | 批量签发 100 条 | 异步队列 |

---

## 11. 链上锚定架构（Q9 修复）

> **本章专门回答**：私钥托管在哪？gas 谁出？选哪条链？

### 11.1 链选型

| 网络 | chainId | 用途 | 成本（2024 起） | 备注 |
|---|---|---|---|---|
| `ethereum-sepolia` | 11155111 | **开发/测试** | 免费（faucet） | 默认 dev 环境 |
| `polygon-mainnet` | 137 | **生产首选** | $0.001-0.01/tx | 兼容 EVM，POS 共识 |
| `arbitrum-mainnet` | 42161 | 生产备选 | $0.05-0.30/tx | L2 Rollup |
| `base-mainnet` | 8453 | 生产备选 | $0.001-0.01/tx | Coinbase L2 |
| `bsc-mainnet` | 56 | 生产备选 | $0.10-0.30/tx | 兼容 EVM |
| `ethereum-mainnet` | 1 | **不推荐生产** | $5-30/tx | gas 过高，仅做 demo |

**默认策略**：dev 用 `ethereum-sepolia`，prod 用 `polygon-mainnet`（运营可在 `SystemConfig.chainAnchorNetwork` 配置）。

### 11.2 私钥托管

**生产**：**AWS KMS**（或阿里云 KMS / HashiCorp Vault 同等方案）。
- 签名者地址在部署时生成，私钥**永不离开 KMS**。
- 后端通过 KMS SDK 调用 `Sign()` 接口，KMS 内部用 HSM 加密。
- 项目方 1 个多签钱包管理签名者（Gnosis Safe），3/5 多签。

**dev / staging**：本地 Keystore 或 `process.env.SIGNER_PRIVATE_KEY`（**仅 dev**）。
- dev `.env` 写入测试网私钥（0x...，**Sepolia 专用**）
- **绝不能**用 prod 私钥

### 11.3 gas 出资

**项目方 paymaster**（推荐）：
- 项目方充值一个 gas 池账户（Polygon 钱包，余额由运营监控）
- 每天定时检查余额，< 0.5 ETH 报警
- 所有 `chainAnchored=true` 的凭证，gas 从 gas 池出
- 在 `SystemConfig` 配 `chainAnchorGasPoolAddress`

**用户自带（可选）**：
- 用户授权 `relayer` 用自己的钱包付 gas
- 后端做 EIP-2771 relay
- 复杂，**不推荐 MVP**

### 11.4 锚定合约

**MVP 方案**：自部署 `AnchorRegistry.sol`（最小化合约）：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AnchorRegistry {
  event VCAnchored(
    bytes32 indexed vcHash,    // keccak256(vcId)
    address indexed issuer,
    address indexed subject,
    uint256 timestamp
  );

  function anchorVC(bytes32 vcHash, address issuer, address subject) external {
    emit VCAnchored(vcHash, issuer, subject, block.timestamp);
  }
}
```

合约地址写入 `SystemConfig.chainAnchorContractAddress`。

### 11.5 锚定流程

```
1. 后端签发 VC，生成 vcId
2. 调 KMS Sign(vcId) → 签名 proof（链下凭证数据完整）
3. 计算 keccak256(vcId) → vcHash
4. 调 anchorVC(vcHash, issuerAddress, subjectAddress)
   → 等 1-3 个区块确认
5. 写 DB: anchorTxHash, anchorBlockNumber, anchoredAt, anchorGasUsed
6. 若失败：anchorRetryCount++, 24h 后重试，最多 3 次
```

### 11.6 失败重试

| 失败原因 | 重试策略 |
|---|---|
| gas 不足 | 报警 + 自动从备用池切 |
| RPC 节点超时 | 切换备用 RPC，5 分钟后重试 |
| nonce 冲突 | 重新 fetch nonce，重试 |
| 合约 revert | 标记 anchorError，**不**重试（需人工排查） |

### 11.6 合约升级与迁移策略

> **为什么需要这章**：智能合约一旦部署即不可改——`AnchorRegistry` 未来必然要加新功能（批量锚定、撤销标记、跨链锚定等）。**没有升级策略，等于把核心凭证数据锁死在 v1 合约**。本节定义 MVP 阶段的升级模式与迁移流程。

#### 11.6.1 升级模式选择

| 模式 | 适用阶段 | 推荐度 | 说明 |
|---|---|---|---|
| **不可升级 (Immutable)** | 极简 MVP / 演示 | ⭐⭐ | 部署后无法改，bug 只能新合约重部署 + 迁移数据 |
| **UUPS Proxy (EIP-1822)** | **MVP 推荐** | ⭐⭐⭐⭐⭐ | 逻辑合约可升级，Proxy 地址不变，存储连续 |
| **Transparent Proxy (EIP-1967)** | 复杂业务 | ⭐⭐⭐ | 更透明但 gas 略高，admin 不能调用实现合约 |
| **Diamond (EIP-2535)** | 高度模块化 | ⭐⭐ | MVP 阶段**不推荐**（复杂度溢出） |

**MVP 选型**：**UUPS Proxy**——升级路径灵活，OpenZeppelin 提供成熟实现。

#### 11.6.2 UUPS 部署结构

```
┌────────────────────────┐
│  ProxyAdmin (Gnosis Safe 3/5 多签)
│    - owner = multisig
│    - 函数: upgradeTo(newImpl)
└──────────┬─────────────┘
           │ upgrade
           ▼
┌────────────────────────┐
│  ERC1967 Proxy (固定地址，永不部署新实例)
│    - 持有所有 storage
│    - delegatecall → Impl
└──────────┬─────────────┘
           │ delegatecall
           ▼
┌────────────────────────┐
│  AnchorRegistry (UUPS Implementation v1 / v2 / ...)
│    - 业务逻辑（可被替换）
│    - 含 _authorizeUpgrade() 仅 owner (ProxyAdmin) 可调
└────────────────────────┘
```

**关键约束**：
- **Proxy 地址 = 永久锚定地址**，写入 `SystemConfig.chainAnchorContractAddress`，**绝不更换**
- 业务方只调 Proxy，所有 storage 在 Proxy 上下文
- 升级 = 部署新 Impl + ProxyAdmin 调 `upgradeTo(newImpl)`

#### 11.6.3 升级安全流程

```
1. 开发新版本 AnchorRegistry_v2.sol（继承 UUPSUpgradeable）
2. 测试网（Sepolia）完整测试：
   - 单元测试（Hardhat / Foundry）
   - 集成测试（已有 v1 数据 + v2 升级后读写）
3. 第三方安全审计（Certik / SlowMist / OpenZeppelin Defender）
4. 部署 v2 Impl 到主网
5. Timelock 队列（48h 延迟）：
   - Multisig 提交 upgradeTo(v2) 到 Timelock
   - 等待 48h 公开窗口（社区可审查交易）
6. Timelock 到期后，Multisig 3/5 签名执行 upgrade
7. 后端 verify：调 Proxy.anchorVC(...) 确认 v2 逻辑生效
8. 后端 verify：v1 时期的链上事件仍可查询（兼容）
```

**Timelock 必选**：给社区/交易所/集成方 48h 反应窗口，**避免中心化单点强升**。

#### 11.6.4 存储兼容性规则（升级禁忌）

升级时**绝不能**：
- ❌ 改变现有 storage 变量顺序
- ❌ 删除现有 storage 变量
- ❌ 改变现有 storage 变量类型
- ❌ 在已有变量前插入新变量

**允许的操作**：
- ✅ 在**末尾**追加新变量
- ✅ 改变现有变量**默认值**（仅限尚未赋值的 slot）
- ✅ 重命名变量（仅影响 Solidity 代码，slot 不变）

**新增字段必须用 storage gap**：
```solidity
contract AnchorRegistryV2 is UUPSUpgradeable {
  // 保留 v1 全部 storage
  // ...

  // V2 新增：批次锚定映射
  mapping(bytes32 => BatchInfo) public batchInfo;

  // 为 V3 预留 storage gap（每升级一次减少 50）
  uint256[50] private __gap_V3;
}
```

#### 11.6.5 数据迁移（v1 → v2 不兼容时）

当 v2 必须改变 storage 布局（如新增 required 字段）：

```typescript
// 部署后立即执行的迁移脚本
async function migrateV1ToV2() {
  // 1. 链上读取 v1 所有 VCAnchored 事件
  const events = await v1Contract.queryFilter(v1Contract.filters.VCAnchored(), 0, 'latest');

  // 2. 升级到 v2（UUPS upgradeTo）
  await proxyAdmin.upgradeTo(v2ImplAddress);

  // 3. 写入 v2 新增的元数据（用 v1 数据 + 后端 DB 补全）
  for (const evt of events) {
    const vc = await db.verifiableCredential.findUnique({ where: { vcHash: evt.args.vcHash } });
    await v2Contract.connect(signer).registerMigration({
      vcHash: evt.args.vcHash,
      originalTimestamp: evt.args.timestamp,
      migrationBlock: await ethers.provider.getBlockNumber(),
    });
  }
}
```

**降级预案**：若升级后发现 v2 有致命 bug，Multisig 可再次 `upgradeTo(v1ImplAddress)` 回滚。

#### 11.6.6 验收用例（合约升级）

| # | 用例 | 期望 |
|---|---|---|
| 1 | 部署 v1，anchor 10 个 VC | 链上 10 个 VCAnchored 事件 |
| 2 | 升级 v1→v2（增加 batchInfo 字段） | Proxy 地址不变，storage 保留 |
| 3 | 升级后查 v1 的 vcHash | 仍可读（兼容） |
| 4 | 升级未经 Timelock | 交易 revert |
| 5 | Multisig 仅 2/5 签名尝试升级 | 交易 revert |
| 6 | 升级时改 v1 已有变量类型 | 编译期警告 + 部署期 revert |
| 7 | v2 部署后 v1 事件仍可索引 | TheGraph / 后端补抓 |

### 11.7 验收用例（链上锚定）

| # | 用例 | 期望 |
|---|---|---|
| 1 | dev 环境锚定 | txHash 在 `https://sepolia.etherscan.io/tx/<hash>` 可查 |
| 2 | prod 环境锚定 | txHash 在 `https://polygonscan.com/tx/<hash>` 可查 |
| 3 | gas 池余额 < 0.5 | 系统报警 |
| 4 | 锚定失败 3 次 | anchorError 写入，不再重试 |
| 5 | 查询凭证详情 | 返回 chainAnchored=true + 完整锚定字段 |
| 6 | 验证凭证的链上存证 | 调合约 `VCAnchored` 事件，匹配 vcHash |
| 7 | 私钥绝不出现日志 | 审计 grep "PRIVATE_KEY" 0 命中 |
| 8 | 改 SIGNER_PRIVATE_KEY | 历史凭证仍可验证（签名已落地） |
