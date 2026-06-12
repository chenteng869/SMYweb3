# DID 统一身份系统 - 文档中心

> **项目**: 中萨数字科技 (ZSDT) DID Identity System
> **版本**: MVP v1.0
> **DID命名空间**: `did:zsdt:{user_no}`
> **状态**: 规划阶段

---

## 文档索引

### 第一层：规划与需求

| #   | 文档                               | 说明                                              |
| --- | ---------------------------------- | ------------------------------------------------- |
| 00  | [00-overview.md](./00-overview.md) | 总览、定位、MVP范围、核心结论、架构图             |
| 01  | [01-prd.md](./01-prd.md)           | 完整PRD：用户角色、生命周期、6大功能模块、MVP定义 |

### 第二层：数据与合约

| #   | 文档                                 | 说明                                             |
| --- | ------------------------------------ | ------------------------------------------------ |
| 02  | [02-database.md](./02-database.md)   | 数据库设计：8张表完整SQL（PostgreSQL）           |
| 03  | [03-contracts.md](./03-contracts.md) | 智能合约：DIDRegistry.sol + ZSDTSBT.sol 完整代码 |

### 第三层：接口与实现

| #   | 文档                                                   | 说明                                           |
| --- | ------------------------------------------------------ | ---------------------------------------------- |
| 04  | [04-api.md](./04-api.md)                               | RESTful API接口设计（注册/登录/绑定/查询/SBT） |
| 05  | [05-wallet-login.md](./05-wallet-login.md)             | 钱包签名登录：NestJS后端 + Next.js前端完整代码 |
| 06  | [06-backend-structure.md](./06-backend-structure.md)   | NestJS后端项目结构 + 模块职责清单              |
| 07  | [07-frontend-structure.md](./07-frontend-structure.md) | Next.js前端页面结构 + 钱包连接组件             |

### 第四层：集成与自动化

| #   | 文档                                                       | 说明                                        |
| --- | ---------------------------------------------------------- | ------------------------------------------- |
| 08  | [08-n8n-workflows.md](./08-n8n-workflows.md)               | n8n自动化工作流（注册/KYC/冻结/SBT签发）    |
| 09  | [09-bpm-flows.md](./09-bpm-flows.md)                       | BPM审批流程（KYC复核/DID冻结/解冻/SBT撤销） |
| 10  | [10-platform-integration.md](./10-platform-integration.md) | 四平台打通：电商/交易所/博彩/官网 接口文档  |

### 第五层：计划与路线图

| #   | 文档                             | 说明                                  |
| --- | -------------------------------- | ------------------------------------- |
| 11  | [11-roadmap.md](./11-roadmap.md) | 开发周期估算(P0/P1/P2) + 最终架构总结 |

---

## 系统架构总览

```
用户浏览器
  ↓
萨摩亚官网 DID Portal
  ↓
钱包连接 (Wagmi / RainbowKit)
  ↓
DID Backend API (NestJS)
  ├── 用户服务 (users)
  ├── 身份服务 (did)
  ├── 钱包服务 (wallets)
  ├── KYC服务 (kyc)
  ├── 凭证服务 (sbt)
  ├── 权限服务 (platform-access)
  ├── 审计日志服务 (audit)
  ├── 跨平台SSO服务 (sso)
  ├── BPM审批对接 (bpm)
  └── n8n自动化 (n8n)
  ↓
数据库 (PostgreSQL / Prisma)
  ↓
私有链 / 联盟链 (EVM兼容)
  ├── DID Registry Contract
  ├── SBT Identity Contract
  ├── Credential Hash Contract
  └── Audit Hash Contract
  ↓
业务平台
  ├── Web3 电商平台
  ├── 中萨数字科技交易所
  ├── 博彩网站
  └── 管理后台 (admin-web)
```

---

## MVP 核心目标

> 用户通过一次注册、一次钱包绑定、一次KYC认证，获得统一DID身份，
> 并在**电商、交易所、博彩、官网**之间实现统一识别与权限控制。

```
DID注册 + 钱包绑定 + KYC状态 + SBT凭证 + 平台权限查询 = 最小可行闭环
```

## 快速导航

- **想了解做什么** → [00-overview](./00-overview.md)
- **想做PRD评审** → [01-prd](./01-prd.md)
- **要建数据库** → [02-database](./02-database.md)
- **要部署合约** → [03-contracts](./03-contracts)
- **要做API开发** → [04-api](./04-api)
- **要做登录功能** → [05-wallet-login](./05-wallet-login)
- **要做后端架构** → [06-backend-structure](./06-backend-structure)
- **要做前端页面** → [07-frontend-structure](./07-frontend-structure)
- **要配n8n自动化** → [08-n8n-workflows](./08-n8n-workflows.md)
- **要配BPM审批** → [09-bpm-flows](./09-bpm-flows.md)
- **要打通四平台** → [10-platform-integration](./10-platform-integration.md)
- **要看排期计划** → [11-roadmap](./11-roadmap.md)

---

_文档来源: [MVP版本-DID制作文档.md](../../MVP版本-DID制作文档.md) (原始大文档，已拆分)_
_最后更新: 2026-06-09_
