# 国学出海Web3 Dapp - 管理员后台系统完整文档

> **文档版本**: V2.0  
> **创建日期**: 2026-05-10  
> **最后更新**: 2026-05-10  

---

## 目录

1. [系统简介](#1-系统简介)
2. [快速开始](#2-快速开始)
3. [功能模块详解](#3-功能模块详解)
4. [界面操作指南](#4-界面操作指南)
5. [开发指南](#5-开发指南)
6. [部署指南](#6-部署指南)
7. [常见问题](#7-常见问题)

---

## 1. 系统简介

### 1.1 系统概述

管理员后台系统是国学出海Web3 Dapp的核心运营管理平台，采用 **Next.js 14 + NestJS 10 + Ant Design 5** 技术栈构建，为运营团队提供全方位的管理能力。

### 1.2 核心特性

| 特性 | 描述 |
|-----|------|
| 🌐 **Web3全生态** | 支持CEX、DEX、NFT、DeFi、内容电商等完整生态管理 |
| 👥 **权限管理** | 基于RBAC的多级权限控制系统 |
| 📊 **数据可视化** | ECharts数据大屏、实时监控看板 |
| 🔐 **安全保障** | 操作审计、日志追踪、安全策略 |
| 🚀 **高性能** | 支持百万级用户并发操作 |

### 1.3 适用角色

| 角色 | 主要职责 |
|-----|---------|
| 超级管理员 | 系统配置、管理员管理、全局监控 |
| 运营主管 | 内容管理、用户运营、数据分析 |
| 内容审核员 | 内容审核、NFT审核、违规处理 |
| 财务管理员 | 对账、提现审核、财务报表 |
| 合规专员 | KYC审核、AML监控、合规报告 |

---

## 2. 快速开始

### 2.1 环境准备

#### 系统要求
- Node.js 18+ 
- PostgreSQL 14+
- Redis 7+
- 现代浏览器（Chrome 100+, Firefox 95+, Safari 15+）

#### 开发环境配置

```bash
# 1. 克隆项目
cd dappweb3.0

# 2. 安装前端依赖
cd frontend
npm install

# 3. 安装后端依赖
cd ../backend
npm install

# 4. 配置环境变量
# 复制 .env.example 为 .env 并填写配置

# 5. 初始化数据库
cd backend
npx prisma generate
npx prisma db push

# 6. 启动后端服务
npm run start:dev

# 7. 启动前端服务（新终端）
cd frontend
npm run dev
```

### 2.2 默认账号

| 用户名 | 密码 | 角色 |
|-------|------|-----|
| admin | admin123 | 超级管理员 |

> ⚠️ **重要**: 首次登录后请立即修改默认密码！

### 2.3 访问地址

- **后台前端**: http://localhost:3000/admin
- **登录页面**: http://localhost:3000/login
- **后端API**: http://localhost:3001/api
- **API文档**: http://localhost:3001/api/docs

---

## 3. 功能模块详解

### 3.1 完整菜单结构

管理员后台包含 **14个一级模块，70+功能页面**：

```
📊 数据中心
├── 仪表盘 (dashboard)
└── 统计报表 (analytics)

🌐 公链管理
├── 节点管理 (chain/nodes)
├── 区块浏览器 (chain/explorer)
├── 链上治理 (chain/governance)
├── 网络监控 (chain/monitor)
└── 跨链桥 (chain/bridge)

💳 CEX中心化交易所
├── 币币交易 (cex/spot)
├── 合约交易 (cex/futures)
├── 杠杆交易 (cex/leverage)
├── 订单管理 (cex/orders)
├── 交易对配置 (cex/pairs)
├── 行情设置 (cex/market)
└── 风险控制 (cex/risk)

🔄 DEX去中心化交易所
├── 流动性池 (dex/pools)
├── 闪兑交易 (dex/swap)
├── 流动性挖矿 (dex/farming)
└── 交易对管理 (dex/pairs)

💰 Web3钱包
├── 地址管理 (wallet/addresses)
├── 资产监控 (wallet/assets)
├── 交易记录 (wallet/transactions)
├── NFT资产管理 (wallet/nfts)
└── 安全策略 (wallet/security)

🏦 质押挖矿
├── 矿池配置 (staking/pools)
├── 质押记录 (staking/records)
├── 收益发放 (staking/rewards)
├── 推荐关系 (staking/referral)
└── 收益率配置 (staking/config)

🚀 IDO/Launchpad
├── 项目管理 (ido/projects)
├── 白名单管理 (ido/whitelist)
├── 申购管理 (ido/subscriptions)
├── 解锁计划 (ido/unlock)
└── 代币分发 (ido/distribution)

📈 量化交易
├── 策略管理 (quant/strategies)
├── 策略回测 (quant/backtest)
├── 跟单订阅 (quant/subscriptions)
├── 绩效监控 (quant/performance)
└── 风险控制 (quant/risk)

🎮 娱乐游戏
├── 幸运抽奖 (game/lottery)
├── 盲盒系统 (game/blindbox)
├── 竞技游戏 (game/games)
├── 奖品管理 (game/prizes)
└── 中奖记录 (game/records)

🛍️ 电商商城
├── 商品管理 (ecommerce/products)
├── 订单处理 (ecommerce/orders)
├── 库存管理 (ecommerce/inventory)
├── 物流配置 (ecommerce/logistics)
└── 财务对账 (ecommerce/finance)

📚 国学内容
├── 国学动漫 (content/animation)
├── 真人短剧 (content/drama)
├── 非遗内容 (content/heritage)
├── 内容审核 (content/audit)
└── 内容NFT (content/nft)

👥 用户运营
├── 用户管理 (users/index)
├── KYC审核 (users/kyc)
├── 等级管理 (users/levels)
└── 邀请关系 (users/referral)

💵 财务中心
├── 财务概览 (finance/overview)
├── 收入统计 (finance/revenue)
├── 对账管理 (finance/reconciliation)
└── 结算管理 (finance/settlement)

⚙️ 系统管理
├── 系统设置 (settings/index)
├── 管理员管理 (settings/admins)
├── 权限管理 (settings/roles)
├── 操作日志 (settings/logs)
├── 系统配置 (settings/config)
└── 服务器监控 (settings/server)
```

### 3.2 模块功能详解

#### 📊 数据中心模块

**仪表盘 (dashboard)**
- 核心指标卡片：总用户、日活、交易额、NFT销量
- 趋势图表：用户增长、交易趋势、收入曲线
- 实时监控：在线用户、系统状态、异常预警
- 待办事项：待审核内容、待处理工单

**统计报表 (analytics)**
- 多维度数据分析
- 自定义报表生成
- 数据导出功能

---

#### 🌐 公链管理模块

**节点管理 (chain/nodes)**
- 节点列表展示
- 节点状态监控（在线/离线/同步中）
- 节点配置管理
- 性能指标监控

**区块浏览器 (chain/explorer)**
- 区块列表查询
- 交易详情查看
- 地址余额查询
- 合约代码验证

**链上治理 (chain/governance)**
- 提案列表
- 投票监控
- 治理参数配置

**网络监控 (chain/monitor)**
- 区块高度监控
- Gas价格监控
- 网络拥堵预警
- 节点健康度

**跨链桥 (chain/bridge)**
- 跨链交易监控
- 桥接配置管理
- 异常交易处理

---

#### 💳 CEX中心化交易所模块

**币币交易 (cex/spot)**
- 交易对管理
- 订单簿监控
- 成交记录查询
- 市场深度展示

**合约交易 (cex/futures)**
- 合约配置
- 持仓监控
- 强制平仓记录
- 资金费率管理

**杠杆交易 (cex/leverage)**
- 杠杆倍数配置
- 借款利率设置
- 风险预警

**订单管理 (cex/orders)**
- 订单查询
- 订单状态更新
- 异常订单处理

**交易对配置 (cex/pairs)**
- 交易对增删改查
- 交易参数配置
- 上下架管理

**行情设置 (cex/market)**
- K线数据生成
- 行情源配置
- 指数价格管理

**风险控制 (cex/risk)**
- 风险参数设置
- 异常交易监控
- 大额交易预警

---

#### 🔄 DEX去中心化交易所模块

**流动性池 (dex/pools)**
- 流动性池列表
- TVL监控
- 池参数配置
- 流动性事件查询

**闪兑交易 (dex/swap)**
- 交易记录查询
- 价格影响分析
- 滑点监控

**流动性挖矿 (dex/farming)**
- 矿池配置
- 收益分配
- 用户质押记录

**交易对管理 (dex/pairs)**
- 交易对创建
- 费率配置
- 流动性引导

---

#### 💰 Web3钱包模块

**地址管理 (wallet/addresses)**
- 地址列表
- 地址标签
- 地址监控

**资产监控 (wallet/assets)**
- 多链资产概览
- 资产变动历史
- 大额异动预警

**交易记录 (wallet/transactions)**
- 交易查询
- 交易详情
- 导出功能

**NFT资产管理 (wallet/nfts)**
- NFT持有统计
- NFT展示
- 批量管理

**安全策略 (wallet/security)**
- 安全规则配置
- 异常登录检测
- 操作授权管理

---

#### 🏦 质押挖矿模块

**矿池配置 (staking/pools)**
- 矿池创建编辑
- 收益配置
- 期限设置

**质押记录 (staking/records)**
- 用户质押记录
- 质押详情
- 状态管理

**收益发放 (staking/rewards)**
- 收益计算
- 发放记录
- 手动补发

**推荐关系 (staking/referral)**
- 推荐关系图谱
- 推荐收益统计
- 层级管理

**收益率配置 (staking/config)**
- 基础收益率
- 动态调整规则
- 奖励系数设置

---

#### 🚀 IDO/Launchpad模块

**项目管理 (ido/projects)**
- 项目创建
- 项目信息编辑
- 项目状态管理

**白名单管理 (ido/whitelist)**
- 白名单导入导出
- 白名单审核
- 资格验证

**申购管理 (ido/subscriptions)**
- 申购记录查询
- 申购详情
- 资金锁定

**解锁计划 (ido/unlock)**
- 解锁规则配置
- 解锁进度监控
- 批量解锁

**代币分发 (ido/distribution)**
- 分发记录
- 分发进度
- 手动调整

---

#### 📈 量化交易模块

**策略管理 (quant/strategies)**
- 策略列表
- 策略参数配置
- 策略上下架

**策略回测 (quant/backtest)**
- 回测任务创建
- 回测结果分析
- 回测报告导出

**跟单订阅 (quant/subscriptions)**
- 用户订阅记录
- 订阅费用管理
- 收益分成

**绩效监控 (quant/performance)**
- 策略收益率
- 回撤监控
- 夏普比率

**风险控制 (quant/risk)**
- 止损止盈配置
- 最大回撤限制
- 风险预警

---

#### 🎮 娱乐游戏模块

**幸运抽奖 (game/lottery)**
- 抽奖活动配置
- 奖品设置
- 中奖记录

**盲盒系统 (game/blindbox)**
- 盲盒系列管理
- 开箱记录
- 稀有度配置

**竞技游戏 (game/games)**
- 游戏配置
- 对局记录
- 排行榜管理

**奖品管理 (game/prizes)**
- 奖品池管理
- 奖品库存
- 发放记录

**中奖记录 (game/records)**
- 中奖查询
- 奖品发货
- 用户反馈

---

#### 🛍️ 电商商城模块

**商品管理 (ecommerce/products)**
- 商品SKU管理
- 商品上下架
- 库存管理

**订单处理 (ecommerce/orders)**
- 订单列表
- 订单状态流转
- 退款处理

**库存管理 (ecommerce/inventory)**
- 库存盘点
- 库存预警
- 入库出库

**物流配置 (ecommerce/logistics)**
- 物流商管理
- 运费模板
- 物流轨迹

**财务对账 (ecommerce/finance)**
- 销售统计
- 退款统计
- 平台分成

---

#### 📚 国学内容模块

**国学动漫 (content/animation)**
- 动漫作品管理
- 剧集管理
- 播放数据统计

**真人短剧 (content/drama)**
- 短剧管理
- 演员管理
- 播放分析

**非遗内容 (content/heritage)**
- 非遗项目管理
- 传承人管理
- 内容展示

**内容审核 (content/audit)**
- 内容审核队列
- AI辅助审核
- 审核记录

**内容NFT (content/nft)**
- 内容NFT铸造
- NFT系列管理
- 版权信息

---

#### 👥 用户运营模块

**用户管理 (users/index)**
- 用户列表查询
- 用户详情查看
- 用户状态管理
- 用户标签管理

**KYC审核 (users/kyc)**
- KYC申请列表
- 证件资料查看
- 审核操作
- 审核记录

**等级管理 (users/levels)**
- 等级体系配置
- 等级权益设置
- 用户等级调整

**邀请关系 (users/referral)**
- 邀请关系图谱
- 邀请奖励统计
- 返佣记录

---

#### 💵 财务中心模块

**财务概览 (finance/overview)**
- 收入统计看板
- 支出分析
- 利润报表

**收入统计 (finance/revenue)**
- 收入来源分析
- 趋势图表
- 对账差异

**对账管理 (finance/reconciliation)**
- 支付渠道对账
- 交易明细核对
- 差异处理

**结算管理 (finance/settlement)**
- 结算记录
- 结算审核
- 打款操作

---

#### ⚙️ 系统管理模块

**系统设置 (settings/index)**
- 基础信息设置
- 品牌配置
- 公告管理

**管理员管理 (settings/admins)**
- 管理员账号
- 角色分配
- 操作记录

**权限管理 (settings/roles)**
- 角色创建
- 权限配置
- 权限继承

**操作日志 (settings/logs)**
- 操作日志查询
- 日志详情
- 日志导出

**系统配置 (settings/config)**
- 参数配置管理
- 热更新配置
- 配置版本

**服务器监控 (settings/server)**
- 服务器状态
- 资源使用率
- 告警管理

---

## 4. 界面操作指南

### 4.1 登录与认证

#### 登录流程

1. 访问 http://localhost:3000/login
2. 输入用户名和密码
3. 点击"登录"按钮
4. 首次登录强制修改密码
5. 进入后台首页

#### 安全设置

```
安全设置步骤：
1. 右上角头像 → 个人设置
2. 修改登录密码
3. 绑定双因素认证（2FA）
4. 设置登录IP白名单
```

### 4.2 通用操作指南

#### 列表页操作

| 操作 | 说明 |
|-----|------|
| 🔍 搜索 | 输入关键词搜索 |
| 🎯 筛选 | 使用筛选条件过滤数据 |
| 📅 日期 | 选择时间范围查询 |
| ➕ 新增 | 点击新增按钮创建记录 |
| ✏️ 编辑 | 点击编辑图标修改记录 |
| 🗑️ 删除 | 点击删除图标（需二次确认） |
| 📤 导出 | 导出数据为Excel/CSV |

#### 详情页操作

1. **基本信息** - 查看记录的主要信息
2. **操作按钮** - 编辑、删除、更多操作
3. **关联数据** - 查看关联的子记录
4. **时间线** - 查看变更历史

### 4.3 常见操作示例

#### 用户封禁操作

1. 进入「用户管理」页面
2. 搜索找到目标用户
3. 点击用户进入详情页
4. 点击「封禁账号」按钮
5. 填写封禁原因和期限
6. 确认提交

#### 内容审核操作

1. 进入「内容审核」队列
2. 点击待审核内容查看详情
3. 检查内容合规性
4. 选择「通过」或「拒绝」
5. 填写审核意见
6. 提交审核结果

---

## 5. 开发指南

### 5.1 项目结构

```
dappweb3.0/
├── frontend/                          # 前端项目
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/                 # 后台路由
│   │   │   │   ├── dashboard/
│   │   │   │   ├── users/
│   │   │   │   ├── content/
│   │   │   │   ├── chain/
│   │   │   │   ├── cex/
│   │   │   │   ├── dex/
│   │   │   │   ├── wallet/
│   │   │   │   ├── staking/
│   │   │   │   ├── ido/
│   │   │   │   ├── quant/
│   │   │   │   ├── game/
│   │   │   │   ├── ecommerce/
│   │   │   │   ├── finance/
│   │   │   │   ├── settings/
│   │   │   │   └── ...
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.tsx    # 后台布局
│   │   │   │   ├── Sidebar.tsx        # 侧边栏
│   │   │   │   ├── DataTable.tsx      # 数据表格
│   │   │   │   ├── DataCard.tsx       # 数据卡片
│   │   │   │   └── ...
│   │   │   └── common/
│   │   ├── services/
│   │   │   ├── api.ts                 # API服务
│   │   │   └── admin-api.ts           # 后台API
│   │   ├── stores/
│   │   │   └── authStore.ts           # 认证状态
│   │   └── types/
│   │       └── index.ts
│   └── package.json
│
├── backend/                           # 后端项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                  # 认证模块
│   │   │   ├── user/                  # 用户模块
│   │   │   ├── content/               # 内容模块
│   │   │   ├── chain/                 # 公链模块
│   │   │   ├── cex/                   # CEX模块
│   │   │   ├── dex/                   # DEX模块
│   │   │   ├── wallet/                # 钱包模块
│   │   │   ├── staking/               # 质押模块
│   │   │   ├── ido/                   # IDO模块
│   │   │   ├── quant/                 # 量化模块
│   │   │   ├── game/                  # 游戏模块
│   │   │   ├── ecommerce/             # 电商模块
│   │   │   ├── finance/               # 财务模块
│   │   │   └── system/                # 系统模块
│   │   ├── common/
│   │   │   ├── prisma.service.ts
│   │   │   ├── guards/
│   │   │   └── ...
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── docs/                              # 文档
    └── admin-dashboard-complete-guide.md
```

### 5.2 前端开发

#### 新增管理页面步骤

1. 在 `frontend/src/app/admin/` 下创建新目录
2. 创建 `page.tsx` 作为页面组件
3. 使用统一的布局和组件
4. 在侧边栏菜单中添加路由

**页面模板示例**：

```tsx
// frontend/src/app/admin/example/page.tsx
'use client';

import React from 'react';
import { Card, Table, Button, Space } from 'antd';

export default function ExamplePage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">示例页面</h1>
        <Button type="primary">新增</Button>
      </div>
      
      <Card>
        <Table 
          dataSource={[]}
          columns={[]}
          pagination
        />
      </Card>
    </div>
  );
}
```

#### 添加菜单项

编辑 `frontend/src/components/admin/AdminLayout.tsx`，在菜单配置中添加：

```tsx
{
  key: 'example',
  icon: <ExampleIcon />,
  label: '示例模块',
  children: [
    { key: '/admin/example/page1', label: '页面1' },
    { key: '/admin/example/page2', label: '页面2' },
  ]
}
```

### 5.3 后端开发

#### 新增模块步骤

1. 在 `backend/src/modules/` 下创建新模块目录
2. 创建 Module、Controller、Service 文件
3. 定义 DTO 数据传输对象
4. 在 `app.module.ts` 中注册模块

**模块示例**：

```typescript
// backend/src/modules/example/example.module.ts
import { Module } from '@nestjs/common';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';

@Module({
  controllers: [ExampleController],
  providers: [ExampleService]
})
export class ExampleModule {}
```

### 5.4 数据库修改

#### 新增数据表

编辑 `backend/prisma/schema.prisma`：

```prisma
model Example {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

执行迁移：

```bash
cd backend
npx prisma migrate dev --name add_example_table
```

### 5.5 API 接口规范

#### 响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": {},
  "message": "操作成功"
}

// 分页响应
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

---

## 6. 部署指南

### 6.1 开发环境部署

见前文「快速开始」章节。

### 6.2 生产环境部署

#### Docker 部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: yourpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

#### 环境变量配置

**后端 .env**：

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dappweb3"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-here"
NODE_ENV="production"
```

**前端 .env.local**：

```env
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_WEB_URL="https://yourdomain.com"
```

---

## 7. 常见问题

### 7.1 登录相关

**Q: 忘记密码怎么办？**
A: 使用默认账号登录后创建新管理员，或联系技术支持重置数据库。

**Q: 提示"账号已被封禁"？**
A: 联系超级管理员解除封禁。

### 7.2 开发相关

**Q: 前端页面热更新不生效？**
A: 重启 `npm run dev`，或检查文件保存。

**Q: Prisma 类型提示不更新？**
A: 运行 `npx prisma generate` 重新生成类型。

### 7.3 部署相关

**Q: Docker 构建失败？**
A: 检查 Dockerfile 和 .dockerignore 配置。

---

## 附录

### 附录A: 技术栈参考

| 技术 | 版本 | 用途 |
|-----|------|------|
| Next.js | 14 | 前端框架 |
| React | 18 | UI 库 |
| TypeScript | 5 | 开发语言 |
| Ant Design | 5 | UI 组件库 |
| NestJS | 10 | 后端框架 |
| Prisma | 5 | ORM |
| PostgreSQL | 14 | 数据库 |
| Redis | 7 | 缓存/会话 |

### 附录B: 相关文档

- [架构设计文档](./admin-dashboard-architecture.md)
- [Web3生态技术方案](./web3-ecosystem-architecture.md)
- [开发进度执行手册](../开发进度执行手册.md)

---

**文档结束**

如有问题，请联系技术支持团队。
