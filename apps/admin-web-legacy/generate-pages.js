const fs = require('fs');
const path = require('path');

const pageTemplate = (title, description) => `'use client';

import { Card, Alert } from 'antd';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function Page() {
  return (
    <AdminLayout>
      <Card title="${title}">
        <Alert message="功能开发中" description="${description}" type="info" />
      </Card>
    </AdminLayout>
  );
}
`;

const pages = [
  // CEX
  { path: 'admin/cex/leverage', title: '杠杆交易', desc: '杠杆交易管理模块正在开发中，敬请期待！' },
  { path: 'admin/cex/orders', title: '订单管理', desc: '订单管理模块正在开发中，敬请期待！' },
  { path: 'admin/cex/pairs', title: '交易对配置', desc: '交易对配置模块正在开发中，敬请期待！' },
  { path: 'admin/cex/market', title: '行情管理', desc: '行情管理模块正在开发中，敬请期待！' },
  { path: 'admin/cex/risk', title: '风险控制', desc: 'CEX风险控制模块正在开发中，敬请期待！' },
  
  // DEX
  { path: 'admin/dex/pools', title: '流动性池', desc: 'DEX流动性池管理模块正在开发中，敬请期待！' },
  { path: 'admin/dex/swap', title: '闪兑交易', desc: 'DEX闪兑交易模块正在开发中，敬请期待！' },
  { path: 'admin/dex/farming', title: '流动性挖矿', desc: 'DEX流动性挖矿模块正在开发中，敬请期待！' },
  { path: 'admin/dex/pairs', title: '交易对管理', desc: 'DEX交易对管理模块正在开发中，敬请期待！' },
  
  // Wallet
  { path: 'admin/wallet/addresses', title: '地址管理', desc: '钱包地址管理模块正在开发中，敬请期待！' },
  { path: 'admin/wallet/assets', title: '资产监控', desc: '钱包资产监控模块正在开发中，敬请期待！' },
  { path: 'admin/wallet/transactions', title: '交易记录', desc: '钱包交易记录模块正在开发中，敬请期待！' },
  { path: 'admin/wallet/nfts', title: 'NFT资产', desc: '钱包NFT资产管理模块正在开发中，敬请期待！' },
  { path: 'admin/wallet/security', title: '安全策略', desc: '钱包安全策略模块正在开发中，敬请期待！' },
  
  // Staking
  { path: 'admin/staking/pools', title: '矿池管理', desc: '质押矿池管理模块正在开发中，敬请期待！' },
  { path: 'admin/staking/records', title: '质押记录', desc: '质押记录管理模块正在开发中，敬请期待！' },
  { path: 'admin/staking/rewards', title: '收益发放', desc: '收益发放管理模块正在开发中，敬请期待！' },
  { path: 'admin/staking/referral', title: '推荐关系', desc: '推荐关系管理模块正在开发中，敬请期待！' },
  { path: 'admin/staking/config', title: '收益率配置', desc: '收益率配置模块正在开发中，敬请期待！' },
  
  // IDO
  { path: 'admin/ido/projects', title: '项目管理', desc: 'IDO项目管理模块正在开发中，敬请期待！' },
  { path: 'admin/ido/whitelist', title: '白名单管理', desc: '白名单管理模块正在开发中，敬请期待！' },
  { path: 'admin/ido/subscriptions', title: '申购管理', desc: '申购管理模块正在开发中，敬请期待！' },
  { path: 'admin/ido/unlock', title: '解锁计划', desc: '解锁计划模块正在开发中，敬请期待！' },
  { path: 'admin/ido/distribution', title: '代币发放', desc: '代币发放模块正在开发中，敬请期待！' },
  
  // Quant
  { path: 'admin/quant/strategies', title: '策略管理', desc: '量化策略管理模块正在开发中，敬请期待！' },
  { path: 'admin/quant/backtest', title: '策略回测', desc: '策略回测模块正在开发中，敬请期待！' },
  { path: 'admin/quant/subscriptions', title: '跟单订阅', desc: '跟单订阅模块正在开发中，敬请期待！' },
  { path: 'admin/quant/performance', title: '绩效监控', desc: '绩效监控模块正在开发中，敬请期待！' },
  { path: 'admin/quant/risk', title: '风险控制', desc: '量化风险控制模块正在开发中，敬请期待！' },
  
  // Entertainment
  { path: 'admin/entertainment/lottery', title: '幸运抽奖', desc: '幸运抽奖模块正在开发中，敬请期待！' },
  { path: 'admin/entertainment/blindbox', title: '盲盒系统', desc: '盲盒系统模块正在开发中，敬请期待！' },
  { path: 'admin/entertainment/games', title: '竞技游戏', desc: '竞技游戏模块正在开发中，敬请期待！' },
  { path: 'admin/entertainment/prizes', title: '奖品管理', desc: '奖品管理模块正在开发中，敬请期待！' },
  { path: 'admin/entertainment/records', title: '中奖记录', desc: '中奖记录模块正在开发中，敬请期待！' },
  
  // Ecommerce
  { path: 'admin/ecommerce/products', title: '商品管理', desc: '商品管理模块正在开发中，敬请期待！' },
  { path: 'admin/ecommerce/orders', title: '订单管理', desc: '订单管理模块正在开发中，敬请期待！' },
  { path: 'admin/ecommerce/inventory', title: '库存管理', desc: '库存管理模块正在开发中，敬请期待！' },
  { path: 'admin/ecommerce/logistics', title: '物流配置', desc: '物流配置模块正在开发中，敬请期待！' },
  { path: 'admin/ecommerce/finance', title: '财务管理', desc: '电商财务管理模块正在开发中，敬请期待！' },
  
  // Content
  { path: 'admin/content/nft', title: '内容NFT', desc: '内容NFT管理模块正在开发中，敬请期待！' },
  
  // Users
  { path: 'admin/users/invite', title: '邀请关系', desc: '邀请关系管理模块正在开发中，敬请期待！' },
  
  // Finance
  { path: 'admin/finance/overview', title: '财务概览', desc: '财务概览模块正在开发中，敬请期待！' },
  { path: 'admin/finance/settlement', title: '结算管理', desc: '结算管理模块正在开发中，敬请期待！' },
  
  // Content remaining
  { path: 'admin/content', title: '内容列表', desc: '内容列表模块正在开发中，敬请期待！' },
  
  // NFT
  { path: 'admin/nfts', title: 'NFT列表', desc: 'NFT列表模块正在开发中，敬请期待！' },
  
  // Transactions
  { path: 'admin/transactions', title: '交易列表', desc: '交易列表模块正在开发中，敬请期待！' },
  
  // Compliance
  { path: 'admin/compliance', title: '合规概览', desc: '合规概览模块正在开发中，敬请期待！' },
];

const baseDir = path.join(__dirname, 'src', 'app');

pages.forEach(page => {
  const dirPath = path.join(baseDir, page.path);
  const filePath = path.join(dirPath, 'page.tsx');
  
  // 创建目录
  fs.mkdirSync(dirPath, { recursive: true });
  
  // 写入文件
  fs.writeFileSync(filePath, pageTemplate(page.title, page.desc));
  console.log(`Created: ${filePath}`);
});

console.log(`\n✅ Successfully created ${pages.length} pages!`);
