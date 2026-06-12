# 国学出海Web3 Dapp独立站 - 开发进度执行手册

> **文档版本**: V1.0  
> **创建日期**: 2026-05-10  
> **适用对象**: 项目全体开发人员、产品经理、设计师、QA测试人员

---

## 目录

1. [项目概述](#1-项目概述)
2. [开发组织架构](#2-开发组织架构)
3. [开发流程规范](#3-开发流程规范)
4. [阶段执行计划](#4-阶段执行计划)
5. [技术规范与标准](#5-技术规范与标准)
6. [质量保障体系](#6-质量保障体系)
7. [风险管理与应急预案](#7-风险管理与应急预案)
8. [沟通协作机制](#8-沟通协作机制)

---

## 1. 项目概述

### 1.1 项目目标

基于 **Dapp + DID + Web3.0** 架构，面向东南亚(SEA)和南美(LATAM)市场构建国学出海跨境播商独立站。

### 1.2 核心技术栈

| 层级         | 技术选型                           |
| ------------ | ---------------------------------- |
| 前端         | Next.js 14 + React 18 + TypeScript |
| 移动端       | React Native (后续)                |
| 区块链交互   | Web3.js / Ethers.js / Wagmi        |
| 智能合约     | Solidity + OpenZeppelin            |
| 后端         | Node.js + NestJS                   |
| 数据库       | PostgreSQL + MongoDB + Redis       |
| 消息队列     | Apache Kafka                       |
| 去中心化存储 | IPFS + Filecoin                    |
| AI服务       | OpenAI API + 自研Agent编排         |
| 容器化       | Docker + Kubernetes                |
| 监控         | Prometheus + Grafana + ELK         |

### 1.3 关键里程碑

| 里程碑 | 时间节点 | 交付物                         |
| ------ | -------- | ------------------------------ |
| M1     | Week 2   | 技术架构设计文档、UI/UX设计稿  |
| M2     | Week 4   | 基础开发环境搭建、核心框架代码 |
| M3     | Week 8   | MVP版本（测试网）              |
| M4     | Week 12  | 安全审计报告、公测版本         |
| M5     | Month 6  | 东南亚正式上线                 |
| M6     | Month 12 | 南美上线、AI中枢大脑           |
| M7     | Month 18 | DAO治理全面启动                |

---

## 2. 开发组织架构

### 2.1 团队角色与职责

| 角色                | 职责                                 | 所需技能                   |
| ------------------- | ------------------------------------ | -------------------------- |
| **技术负责人(CTO)** | 技术架构设计、技术决策、代码质量把控 | 全栈、Web3、系统设计       |
| **前端开发**        | Dapp前端开发、Web3钱包集成           | React/Next.js、Web3.js     |
| **区块链开发**      | 智能合约开发、安全审计               | Solidity、OpenZeppelin     |
| **后端开发**        | API服务、业务逻辑、数据库设计        | NestJS/Node.js、PostgreSQL |
| **全栈开发**        | 前后端联调、功能模块开发             | 前后端兼顾                 |
| **AI/ML工程师**     | AI Agent编排、内容生成集成           | OpenAI API、Agent设计      |
| **DevOps工程师**    | CI/CD、部署、监控、运维              | Docker、K8s、AWS/GCP       |
| **安全工程师**      | 合约审计、渗透测试、安全加固         | Web3安全、智能合约审计     |
| **产品经理(PM)**    | 需求管理、进度跟踪、资源协调         | 产品设计、项目管理         |
| **UI/UX设计师**     | 界面设计、用户体验优化               | Figma、Web设计             |
| **QA测试工程师**    | 测试计划、功能测试、自动化测试       | 测试设计、自动化测试       |

### 2.2 协作工具链

| 类别     | 工具选择                        |
| -------- | ------------------------------- |
| 项目管理 | GitHub Projects / Jira / Trello |
| 代码管理 | GitHub / GitLab                 |
| 文档协作 | Notion / Confluence             |
| 设计协作 | Figma                           |
| 即时通讯 | Discord / Slack / 飞书          |
| 视频会议 | Zoom / 腾讯会议                 |
| CI/CD    | GitHub Actions / GitLab CI      |
| 监控告警 | Prometheus + Grafana            |
| 错误追踪 | Sentry                          |

---

## 3. 开发流程规范

### 3.1 Git分支管理策略

采用 **Git Flow** 分支模型：

```
main (主分支，生产环境)
  └── develop (开发分支，集成测试)
        ├── feature/* (功能分支)
        ├── hotfix/* (热修复分支)
        └── release/* (发布分支)
```

#### 分支命名规范

- `feature/功能名称-开发者` - 功能开发分支
- `hotfix/问题描述-日期` - 紧急修复分支
- `release/v版本号` - 发布分支

#### 提交信息规范

采用 **Conventional Commits** 格式：

```
<type>(<scope>): <subject>

类型：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具相关
```

### 3.2 开发工作流

#### 标准功能开发流程

```
1. 任务分配（Issue创建）
   ↓
2. 创建feature分支
   ↓
3. 本地开发与单元测试
   ↓
4. 提交代码（符合commit规范）
   ↓
5. 创建Pull Request
   ↓
6. 代码审查（至少1人审批）
   ↓
7. 合并到develop分支
   ↓
8. 自动CI/CD构建与部署
   ↓
9. 集成测试与QA验证
```

#### Pull Request审查检查清单

- [ ] 代码符合项目规范
- [ ] 包含必要的单元测试
- [ ] 相关文档已更新
- [ ] CI/CD构建通过
- [ ] 无安全漏洞
- [ ] 至少1位审查者批准

### 3.3 开发环境配置

#### 本地开发环境要求

- Node.js 20+
- Docker & Docker Compose
- Git
- VS Code / WebStorm

#### 环境变量管理

```
.env.local          # 本地开发环境
.env.development    # 开发环境
.env.staging        # 预发布环境
.env.production     # 生产环境（加密存储）
```

---

## 4. 阶段执行计划

### 4.1 Phase 1: 基础设施搭建 (Week 1-2)

#### Week 1: 项目初始化

- [x] 项目仓库创建与权限配置
- [x] 技术架构文档最终确认
- [x] UI/UX设计稿评审
- [x] 开发环境搭建
- [x] CI/CD流水线配置
- [x] 数据库设计文档

**交付物**:

- 完整项目脚手架
- 架构设计文档V1.0
- 数据库Schema

#### Week 2: 核心框架开发

- [ ] 前端Next.js项目初始化
- [ ] 后端NestJS项目初始化
- [ ] 智能合约项目初始化(Hardhat/Truffle)
- [ ] 用户认证基础模块
- [ ] 基础API服务框架

**交付物**:

- 可运行的前端/后端项目
- 基础API文档

### 4.2 Phase 2: MVP核心功能 (Week 3-8)

#### Week 3-4: DID身份与钱包集成

| 任务             | 负责人 | 交付标准                                   |
| ---------------- | ------ | ------------------------------------------ |
| Web3钱包连接     | 前端   | 支持MetaMask/WalletConnect/Coinbase Wallet |
| DID身份注册/登录 | 全栈   | 完整身份注册流程                           |
| 身份分层体系     | 全栈   | L1-L4身份权限控制                          |
| KYC基础集成      | 后端   | KYC服务商API对接                           |

**技术要点**:

- 使用Wagmi/Viem进行钱包连接
- 实现DID文档存储与解析
- JWT + Session管理

#### Week 5-6: 内容与商城模块

| 任务         | 负责人      | 交付标准            |
| ------------ | ----------- | ------------------- |
| 内容展示页面 | 前端        | 首页、内容详情页    |
| 内容上传功能 | 全栈        | 创作者内容上传流程  |
| IPFS集成     | 后端/DevOps | 内容文件上链存储    |
| 商品购买流程 | 全栈        | 完整购物车→支付流程 |

**技术要点**:

- IPFS HTTP API集成
- 内容元数据设计
- 购物车状态管理

#### Week 7-8: NFT与支付模块

| 任务            | 负责人 | 交付标准                 |
| --------------- | ------ | ------------------------ |
| ERC-721合约开发 | 区块链 | 基础NFT合约，审计通过    |
| NFT铸造功能     | 全栈   | 内容→NFT完整流程         |
| 支付渠道集成1   | 后端   | GrabPay/Mercado Pago集成 |
| 加密货币支付    | 全栈   | USDC/ETH支付支持         |

**技术要点**:

- OpenZeppelin标准合约
- Chainlink Price Feeds
- 支付回调安全验证

**MVP里程碑 (Week 8)**:

- ✅ 完整的用户注册→浏览→购买流程
- ✅ 基础NFT铸造与展示
- ✅ 测试网部署
- ✅ 内部测试通过

### 4.3 Phase 3: OID确权与扩展功能 (Week 9-16)

#### Week 9-10: OID确真系统

| 任务          | 负责人  |
| ------------- | ------- |
| OID标识符生成 | 后端    |
| 内容指纹提取  | 后端/AI |
| 原创性检测    | AI      |
| 时间戳证明    | 区块链  |

#### Week 11-12: 跨链与DCV定价

| 任务            | 负责人 |
| --------------- | ------ |
| 跨链桥集成      | 区块链 |
| DCV动态定价算法 | 后端   |
| 多支付渠道集成  | 后端   |
| AML监控基础     | 后端   |

#### Week 13-14: AI基础功能

| 任务              | 负责人    |
| ----------------- | --------- |
| OpenAI API集成    | AI/后端   |
| 内容生成Agent基础 | AI/后端   |
| 多语言翻译        | 前端/后端 |

#### Week 15-16: 直播与社区

| 任务          | 负责人      |
| ------------- | ----------- |
| 直播推流/拉流 | 全栈/DevOps |
| 互动功能      | 前端/后端   |
| 社区论坛基础  | 全栈        |

### 4.4 Phase 4: 安全审计与上线 (Month 4-6)

#### Month 4: 安全加固与审计

- [ ] 智能合约安全审计（第三方）
- [ ] 渗透测试
- [ ] 安全加固
- [ ] 漏洞修复

#### Month 5: 测试与优化

- [ ] 全功能测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 压力测试

#### Month 6: 东南亚上线

- [ ] 合规报备
- [ ] 主网部署
- [ ] 灰度发布
- [ ] 正式上线

### 4.5 Phase 5-7: 长期规划 (Month 7-18)

#### Month 7-12: 南美扩展与AI中枢

- 南美市场本地化
- 全营销工具
- 50+ AI Agent完整体系
- RPA自动化工作流

#### Month 13-18: DAO与生态

- 治理代币发行
- DAO治理系统
- 跨链生态扩展
- 全球节点部署

---

## 5. 技术规范与标准

### 5.1 前端开发规范

#### 代码规范

- TypeScript严格模式
- ESLint + Prettier格式化
- 组件命名：PascalCase
- 文件命名：kebab-case

#### 目录结构

```
src/
├── components/       # React组件
├── pages/           # Next.js页面
├── hooks/           # 自定义Hooks
├── utils/           # 工具函数
├── types/           # TypeScript类型定义
├── services/        # API服务
├── store/           # 状态管理(Zustand)
└── styles/          # 样式文件
```

#### Web3集成规范

```typescript
// hooks/useWeb3.ts
import { useWalletClient, useAccount } from 'wagmi';

export function useWeb3() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return { address, isConnected, walletClient };
}
```

### 5.2 智能合约开发规范

#### 安全原则

- 所有合约继承OpenZeppelin标准
- 使用ReentrancyGuard防重入
- 完善的权限控制（Ownable/AccessControl）
- 关键操作事件记录

#### 合约模板

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GuoxueNFT is ERC721, Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC721("GuoxueNFT", "GNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // 合约实现...
}
```

#### 测试要求

- 单元测试覆盖率 ≥ 80%
- 集成测试覆盖主要业务流程
- Fuzzing测试
- 主网分叉测试

### 5.3 后端开发规范

#### NestJS模块结构

```
src/
├── modules/
│   ├── auth/          # 认证模块
│   ├── user/          # 用户模块
│   ├── content/       # 内容模块
│   ├── nft/           # NFT模块
│   └── payment/       # 支付模块
├── common/            # 公共模块
├── guards/            # 守卫
├── interceptors/      # 拦截器
└── filters/           # 异常过滤器
```

#### API响应标准

```typescript
// 成功响应
{
  "success": true,
  "data": { /* 业务数据 */ },
  "message": "操作成功",
  "timestamp": "2026-05-10T00:00:00Z"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2026-05-10T00:00:00Z"
}
```

### 5.4 数据库设计规范

#### 命名规范

- 表名：小写+下划线，复数形式 `user_profiles`
- 字段名：小写+下划线 `created_at`
- 主键：id（自增或UUID）
- 时间戳：created_at, updated_at

#### 必备字段

所有表应包含：

```sql
id UUID PRIMARY KEY,
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
is_deleted BOOLEAN NOT NULL DEFAULT FALSE
```

---

## 6. 质量保障体系

### 6.1 测试金字塔

```
        /\
       /E2E\        端到端测试（10%）
      /------\
     /集成测试\     集成测试（30%）
    /----------\
   /  单元测试  \    单元测试（60%）
  /--------------\
```

### 6.2 测试计划

#### 单元测试

- 范围：所有工具函数、业务逻辑、合约函数
- 框架：Jest (JS/TS)、Foundry/Hardhat (Solidity)
- 覆盖率要求：≥80%

#### 集成测试

- 范围：API接口、前后端交互、合约交互
- 框架：Supertest、Playwright
- 执行时机：每次PR合并后

#### E2E测试

- 范围：核心用户流程
- 框架：Playwright / Cypress
- 执行时机：发布前

#### 安全测试

- 智能合约审计（第三方）
- 渗透测试
- 依赖漏洞扫描（npm audit、Mythril）

### 6.3 质量门禁

PR合并前必须通过：

- ✅ 单元测试通过
- ✅ ESLint无错误
- ✅ TypeScript类型检查通过
- ✅ CI/CD构建成功
- ✅ 至少1人代码审查
- ✅ 无高危安全漏洞

发布前必须通过：

- ✅ 集成测试通过
- ✅ E2E测试通过
- ✅ 性能测试达标
- ✅ 安全审计通过
- ✅ QA验收通过

---

## 7. 风险管理与应急预案

### 7.1 风险登记册

| 风险ID | 风险描述        | 概率 | 影响 | 应对策略                       | 负责人      |
| ------ | --------------- | ---- | ---- | ------------------------------ | ----------- |
| R01    | 智能合约漏洞    | 中   | 高   | 多轮审计、暂停开关、保险基金   | 安全工程师  |
| R02    | 跨链桥安全事件  | 中   | 高   | 限额机制、成熟方案、监控告警   | 区块链开发  |
| R03    | 支付渠道被封    | 中   | 高   | 多渠道备份、快速切换           | 后端/DevOps |
| R04    | 监管政策变化    | 中   | 高   | 合规优先、灵活架构、多区域分散 | CTO/法务    |
| R05    | 开发进度延期    | 高   | 中   | 敏捷开发、优先级管理、缓冲区   | PM          |
| R06    | 核心成员离职    | 低   | 中   | 知识文档化、代码审查、备份人员 | CTO         |
| R07    | AWS/GCP服务中断 | 低   | 中   | 多区域部署、灾备方案           | DevOps      |
| R08    | AI成本超支      | 中   | 中   | 成本监控、缓存优化、模型分级   | AI工程师    |

### 7.2 应急预案

#### 智能合约安全事件

1. **检测**: 监控告警触发异常交易
2. **响应**:
   - 立即调用暂停功能
   - 多签冻结风险资金
   - 启动应急会议
3. **处置**:
   - 分析漏洞原因
   - 开发修复补丁
   - 安全审计验证
4. **恢复**:
   - 测试网验证修复
   - 主网部署新合约
   - 逐步恢复功能

#### 支付渠道中断

1. **检测**: 支付回调失败率异常升高
2. **响应**:
   - 自动切换备用支付渠道
   - 通知用户支付方式变更
   - 联系支付服务商排查
3. **恢复**:
   - 主渠道修复后灰度切换
   - 补偿受影响用户

#### 监管政策突变

1. **预警**: 法务团队监控政策变化
2. **响应**:
   - 48小时内评估影响
   - 紧急会议制定应对方案
   - 必要时暂停相关功能
3. **调整**:
   - 架构调整适配新政策
   - 用户沟通与引导

---

## 8. 沟通协作机制

### 8.1 会议制度

| 会议类型       | 频率       | 时长    | 参与人员       | 议程                         |
| -------------- | ---------- | ------- | -------------- | ---------------------------- |
| **每日站会**   | 每个工作日 | 15分钟  | 全体开发       | 昨日进度、今日计划、阻塞问题 |
| **周例会**     | 每周一     | 1小时   | 全体团队       | 上周总结、本周计划、风险讨论 |
| **技术评审会** | 按需       | 1-2小时 | 技术团队       | 架构设计、技术方案评审       |
| **产品评审会** | 每周五     | 1小时   | 产品+设计+开发 | 需求评审、进度同步           |
| **迭代回顾会** | 每2周      | 1小时   | 全体团队       | 复盘总结、流程优化           |

### 8.2 文档管理

#### 文档分类

- **产品文档**: PRD、用户故事、功能规格书
- **技术文档**: 架构设计、API文档、部署文档
- **运维文档**: 运维手册、故障处理、监控告警
- **项目文档**: 会议纪要、决策记录、进度报告

#### 文档更新要求

- 架构变更24小时内更新文档
- API变更同步更新API文档
- 重要决策记录在案

### 8.3 问题升级机制

```
问题发现
  ↓
团队内部讨论（24小时内）
  ↓
未解决 → 升级到技术负责人（48小时内）
  ↓
未解决 → 升级到CTO/项目总监（72小时内）
  ↓
重大问题 → 紧急会议决策
```

---

## 附录

### 附录A: 参考资料

- [国学出海Web3 Dapp - DAO备案档案V1.0](./国学出海Web3_Dapp独立站_DAO备案档案_V1.0.md)
- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [OpenZeppelin文档](https://docs.openzeppelin.com/)
- [Next.js文档](https://nextjs.org/docs)
- [NestJS文档](https://docs.nestjs.com/)

### 附录B: 联系方式

- **技术问题**: Discord #tech-support
- **产品问题**: Discord #product
- **紧急事件**: 24小时响应电话群

---

**文档维护**: 本文档将随项目进展持续更新，每季度进行一次全面评审。

---

_执行手册结束_
