# 00 - DID系统总览

> **来源**: MVP版本-DID制作文档.md (第1~130行 + 第1372~1500行)
> **状态**: 规划确认

---

## 一、核心结论

**DID系统可以开发出来。**

但 DID 不是一个单独页面，而是一整套：
**身份协议 + 钱包绑定 + KYC状态 + 凭证签发 + 链上/链下数据存证 + 多平台统一登录** 系统。

---

## 二、DID在生态中的定位

本 DID 系统用于打通以下四个平台：

| #   | 平台                    | 角色                                      |
| --- | ----------------------- | ----------------------------------------- |
| 1   | DApp + Web3 电商平台    | 使用DID判断身份/会员等级/NFT权益/订单归属 |
| 2   | 中萨数字科技交易所      | 使用DID判断KYC/AML/风险/提现权限          |
| 3   | 持牌博彩网站            | 使用DID判断年龄/KYC/责任博彩状态          |
| 4   | 萨摩亚官网 / DID Portal | 作为统一入口：注册/钱包绑定/KYC/SBT发放   |

**用户只需要完成一次身份注册、钱包绑定、KYC认证，就可以在四个平台中被统一识别和授权。**

---

## 三、MVP版本功能清单（第一版必须完成）

```text
1. 用户注册DID
2. 钱包绑定
3. 钱包签名登录
4. KYC状态绑定
5. 发放SBT身份凭证
6. DID身份查询
7. 跨平台统一登录
8. 权限与会员等级同步
9. DID资料更新
10. 审计日志记录
```

**MVP最小闭环 = DID注册 + 钱包签名登录 + KYC状态 + SBT凭证 + 四个平台统一识别**

---

## 四、DID命名空间设计

### 方案对比

| 方案                  | 示例                         | 评价                            |
| --------------------- | ---------------------------- | ------------------------------- |
| `did:samoa:...`       | `did:samoa:8f3a91b7c2e944a9` | 国家级前缀                      |
| `did:zsdigital:...`   | `did:zsdigital:0xAbc123...`  | 公司名前缀                      |
| `did:wallet:...`      | `did:wallet:0xAbc123456789`  | 基于钱包地址                    |
| **`did:zsdt:...`** ✅ | **`did:zsdt:U202600000001`** | **推荐：自有命名空间+用户编号** |

### 最终选择

```
did:zsdt:{user_no}
示例: did:zsdt:U202600000001
```

---

## 五、技术架构图

```
用户浏览器
  ↓
萨摩亚官网 DID Portal
  ↓
钱包连接 Wagmi / RainbowKit
  ↓
DID Backend API
  ├── 用户服务
  ├── 钱包服务
  ├── KYC服务
  ├── 凭证服务
  ├── SBT服务
  ├── 权限服务
  ├── 审计日志服务
  └── 跨平台SSO服务
  ↓
数据库 PostgreSQL
  ↓
私有链 / 联盟链 (EVM兼容)
  ├── DID Registry Contract
  ├── SBT Identity Contract
  ├── Credential Hash Contract
  └── Audit Hash Contract
  ↓
业务平台
  ├── Web3电商
  ├── 数字科技交易所
  ├── 博彩网站
  └── 管理后台
```

---

## 六、推荐技术栈

| 层级     | 技术                        |
| -------- | --------------------------- |
| 前端     | Next.js / React             |
| 钱包连接 | Wagmi + RainbowKit          |
| 后端     | NestJS                      |
| 数据库   | PostgreSQL + Prisma ORM     |
| 缓存     | Redis                       |
| 区块链   | 私有链 / EVM兼容链          |
| 合约     | Solidity + OpenZeppelin     |
| 合约开发 | Hardhat / Foundry           |
| 凭证标准 | Verifiable Credentials (VC) |
| SBT实现  | ERC721改造（禁止转让）      |
| 自动化   | n8n                         |
| 审批     | BPM工作流引擎               |
| AI辅助   | 大模型 + RAG                |
| 审计日志 | OpenSearch / Elasticsearch  |

---

## 七、DID核心结构

每个用户对应一个 DID：

```json
{
  "did": "did:zsdt:U202600000001",
  "status": "active",
  "kycStatus": "verified",
  "kycHash": "0x9a8b7c...",
  "primaryWallet": "0xabc...",
  "memberLevel": "gold",
  "riskLevel": "low"
}
```

### 链下保存（隐私数据）

```text
姓名、证件号、护照、地址、出生日期、KYC图片、人脸识别结果
```

### 链上只保存（哈希/状态）

```json
{
  "did": "did:zsdt:U202600000001",
  "kyc_status": "verified",
  "kyc_hash": "0x9a8b7c...",
  "verified_at": "2026-01-01",
  "issuer": "ZSDT Compliance"
}
```

---

## 八、SBT凭证类型

SBT (Soulbound Token) 是不可转让的身份凭证。

| SBT类型               | 用途                 |
| --------------------- | -------------------- |
| KYC_VERIFIED          | 表示用户已完成KYC    |
| MEMBER                | 表示普通生态会员     |
| VIP                   | 表示高等级会员       |
| MERCHANT              | 表示商户身份         |
| AML_CLEARED           | 表示通过合规审查     |
| RESPONSIBLE_GAMING_OK | 博彩责任博彩状态合规 |
| EXCHANGE_ALLOWED      | 允许进入交易所       |
| ECOSYSTEM_USER        | 表示生态用户凭证     |

**关键规则**:

- SBT 不可转让（override transferFrom 为 revert）
- SBT 不暴露隐私信息
- SBT 只表示状态，不显示证件明文

---

## 九、支持的钱包

### 钱包列表

```text
MetaMask / OKX Wallet / Bitget Wallet / Binance Web3 Wallet
Trust Wallet / WalletConnect / Phantom / Rabby / Coinbase Wallet
```

### 钱包角色分类

每个用户可以有多个钱包，分角色管理：

```text
主钱包      → 签名登录 + DID绑定
备用钱包    → 身份恢复
支付钱包    → 资金操作
交易所钱包  → 交易专用
电商钱包    → 电商下单
博彩钱包    → 博彩充值提现（需隔离）
```

---

## 十、四平台打通方式

### 萨摩亚官网（统一入口）

```
官网 → DID注册 → 钱包绑定 → KYC认证 → SBT发放 → 生态入口分发
```

官网是：身份入口 / 合规入口 / 执照展示入口 / 用户协议入口 / DID查询入口

### Web3电商平台

```
DID登录 → 读会员等级 → 读NFT/SBT → 展示专属价格 → 下单 → 订单哈希绑DID → 支付成功
```

判断维度：用户身份 / 会员等级 / NFT会员权益 / Token积分 / 订单归属 / 钱包支付权限 / 优惠权益

### 中萨数字科技交易所

```
DID登录 → 检查KYC → 检查AML → 检查地区 → 检查风险 → 允许查看/交易/提现
```

判断维度：是否完成KYC / 是否允许交易 / 是否高风险 / 是否可提现 / 是否通过AML / 是否绑定主钱包

### 博彩网站

```
DID登录 → 检查年龄 → 检查KYC → 检查责任博彩状态 → 检查AML → 允许进入游戏
```

判断维度：是否成年 / 是否完成KYC / 是否自我排除 / 是否冷静期 / 是否允许充值/提现 / 是否命中AML / 是否允许营销触达

---

_下一节_: [01-prd.md](./01-prd.md) — 完整PRD文档
