'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Avatar, Dropdown, Button, Space, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  TransactionOutlined,
  SafetyOutlined,
  DollarOutlined,
  SettingOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  TeamOutlined,
  IdcardOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  ContainerOutlined,
  ShopOutlined,
  CreditCardOutlined,
  WalletOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  BarChartOutlined,
  AccountBookOutlined,
  CheckCircleOutlined,
  UsergroupAddOutlined,
  LockOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  SwapOutlined,
  RocketOutlined,
  UnlockOutlined,
  TrophyOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  BuildOutlined,
  FundOutlined,
  ExperimentOutlined,
  ScanOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';

const { Header, Sider, Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    key: '/admin/dashboard',
    icon: <DashboardOutlined />,
    label: '数据中心',
  },
  {
    key: 'web3-group',
    icon: <ThunderboltOutlined />,
    label: 'Web3.0 管理',
    children: [
      {
        key: '/admin/web3/dashboard',
        icon: <BarChartOutlined />,
        label: 'Web3 数据看板',
      },
      {
        key: '/admin/web3/dapps',
        icon: <AppstoreOutlined />,
        label: 'DApp 接入管理',
      },
      {
        key: '/admin/web3/blockchain',
        icon: <ScanOutlined />,
        label: '区块链监控',
      },
    ],
  },
  {
    key: 'chain-group',
    icon: <GlobalOutlined />,
    label: '公链管理',
    children: [
      {
        key: '/admin/chain/nodes',
        icon: <CloudServerOutlined />,
        label: '节点管理',
      },
      {
        key: '/admin/chain/explorer',
        icon: <AppstoreOutlined />,
        label: '区块浏览',
      },
      {
        key: '/admin/chain/governance',
        icon: <AuditOutlined />,
        label: '链上治理',
      },
      {
        key: '/admin/chain/monitor',
        icon: <BarChartOutlined />,
        label: '网络监控',
      },
      {
        key: '/admin/chain/bridge',
        icon: <TransactionOutlined />,
        label: '跨链桥',
      },
    ],
  },
  {
    key: 'cex-group',
    icon: <CreditCardOutlined />,
    label: 'CEX交易所',
    children: [
      {
        key: '/admin/cex/spot',
        icon: <ShoppingOutlined />,
        label: '币币交易',
      },
      {
        key: '/admin/cex/futures',
        icon: <SafetyCertificateOutlined />,
        label: '合约交易',
      },
      {
        key: '/admin/cex/leverage',
        icon: <AlertOutlined />,
        label: '杠杆交易',
      },
      {
        key: '/admin/cex/orders',
        icon: <ContainerOutlined />,
        label: '订单管理',
      },
      {
        key: '/admin/cex/pairs',
        icon: <AppstoreOutlined />,
        label: '交易对配置',
      },
      {
        key: '/admin/cex/market',
        icon: <BarChartOutlined />,
        label: '行情管理',
      },
      {
        key: '/admin/cex/risk',
        icon: <SafetyOutlined />,
        label: '风险控制',
      },
    ],
  },
  {
    key: 'dex-group',
    icon: <SwapOutlined />,
    label: 'DEX交易所',
    children: [
      {
        key: '/admin/dex/pools',
        icon: <ContainerOutlined />,
        label: '流动性池',
      },
      {
        key: '/admin/dex/swap',
        icon: <TransactionOutlined />,
        label: '闪兑交易',
      },
      {
        key: '/admin/dex/farming',
        icon: <BankOutlined />,
        label: '流动性挖矿',
      },
      {
        key: '/admin/dex/pairs',
        icon: <AppstoreOutlined />,
        label: '交易对管理',
      },
    ],
  },
  {
    key: 'defi-group',
    icon: <FundOutlined />,
    label: 'DeFi管理',
    children: [
      {
        key: '/admin/defi/staking',
        icon: <LockOutlined />,
        label: '质押管理',
      },
      {
        key: '/admin/defi/liquidity',
        icon: <SwapOutlined />,
        label: '流动性管理',
      },
      {
        key: '/admin/defi/rewards',
        icon: <TrophyOutlined />,
        label: '收益分配',
      },
    ],
  },
  {
    key: 'wallet-group',
    icon: <WalletOutlined />,
    label: 'Web3钱包',
    children: [
      {
        key: '/admin/wallet/addresses',
        icon: <IdcardOutlined />,
        label: '地址管理',
      },
      {
        key: '/admin/wallet/assets',
        icon: <DollarOutlined />,
        label: '资产监控',
      },
      {
        key: '/admin/wallet/transactions',
        icon: <TransactionOutlined />,
        label: '交易记录',
      },
      {
        key: '/admin/wallet/nfts',
        icon: <PictureOutlined />,
        label: 'NFT资产',
      },
      {
        key: '/admin/wallet/security',
        icon: <SafetyOutlined />,
        label: '安全策略',
      },
    ],
  },
  {
    key: 'staking-group',
    icon: <AccountBookOutlined />,
    label: '质押挖矿',
    children: [
      {
        key: '/admin/staking/pools',
        icon: <ContainerOutlined />,
        label: '矿池管理',
      },
      {
        key: '/admin/staking/records',
        icon: <FileTextOutlined />,
        label: '质押记录',
      },
      {
        key: '/admin/staking/rewards',
        icon: <DollarOutlined />,
        label: '收益发放',
      },
      {
        key: '/admin/staking/referral',
        icon: <TeamOutlined />,
        label: '推荐关系',
      },
      {
        key: '/admin/staking/config',
        icon: <SettingOutlined />,
        label: '收益率配置',
      },
    ],
  },
  {
    key: 'ido-group',
    icon: <RocketOutlined />,
    label: 'IDO/Launchpad',
    children: [
      {
        key: '/admin/ido/projects',
        icon: <AppstoreOutlined />,
        label: '项目管理',
      },
      {
        key: '/admin/ido/whitelist',
        icon: <UsergroupAddOutlined />,
        label: '白名单管理',
      },
      {
        key: '/admin/ido/subscriptions',
        icon: <FileTextOutlined />,
        label: '申购管理',
      },
      {
        key: '/admin/ido/unlock',
        icon: <UnlockOutlined />,
        label: '解锁计划',
      },
      {
        key: '/admin/ido/distribution',
        icon: <CreditCardOutlined />,
        label: '代币发放',
      },
    ],
  },
  {
    key: 'quant-group',
    icon: <BarChartOutlined />,
    label: '量化交易',
    children: [
      {
        key: '/admin/quant/strategies',
        icon: <AppstoreOutlined />,
        label: '策略管理',
      },
      {
        key: '/admin/quant/backtest',
        icon: <HistoryOutlined />,
        label: '策略回测',
      },
      {
        key: '/admin/quant/subscriptions',
        icon: <UserOutlined />,
        label: '跟单订阅',
      },
      {
        key: '/admin/quant/performance',
        icon: <BarChartOutlined />,
        label: '绩效监控',
      },
      {
        key: '/admin/quant/risk',
        icon: <SafetyOutlined />,
        label: '风险控制',
      },
    ],
  },
  {
    key: 'entertainment-group',
    icon: <TrophyOutlined />,
    label: '娱乐游戏',
    children: [
      {
        key: '/admin/entertainment/lottery',
        icon: <GiftOutlined />,
        label: '幸运抽奖',
      },
      {
        key: '/admin/entertainment/blindbox',
        icon: <ContainerOutlined />,
        label: '盲盒系统',
      },
      {
        key: '/admin/entertainment/games',
        icon: <VideoCameraOutlined />,
        label: '竞技游戏',
      },
      {
        key: '/admin/entertainment/prizes',
        icon: <GiftOutlined />,
        label: '奖品管理',
      },
      {
        key: '/admin/entertainment/records',
        icon: <HistoryOutlined />,
        label: '中奖记录',
      },
    ],
  },
  {
    key: 'ecommerce-group',
    icon: <ShopOutlined />,
    label: '电商商城',
    children: [
      {
        key: '/admin/ecommerce/products',
        icon: <AppstoreOutlined />,
        label: '商品管理',
      },
      {
        key: '/admin/ecommerce/orders',
        icon: <ShoppingCartOutlined />,
        label: '订单管理',
      },
      {
        key: '/admin/ecommerce/inventory',
        icon: <ContainerOutlined />,
        label: '库存管理',
      },
      {
        key: '/admin/ecommerce/logistics',
        icon: <CarOutlined />,
        label: '物流配置',
      },
      {
        key: '/admin/ecommerce/finance',
        icon: <DollarOutlined />,
        label: '财务管理',
      },
    ],
  },
  {
    key: 'content-group',
    icon: <FileTextOutlined />,
    label: '国学内容',
    children: [
      {
        key: '/admin/content/animation',
        icon: <VideoCameraOutlined />,
        label: '国学动漫',
      },
      {
        key: '/admin/content/drama',
        icon: <VideoCameraOutlined />,
        label: '真人短剧',
      },
      {
        key: '/admin/content/heritage',
        icon: <PictureOutlined />,
        label: '非遗内容',
      },
      {
        key: '/admin/content/audit',
        icon: <AuditOutlined />,
        label: '内容审核',
      },
      {
        key: '/admin/content/nft',
        icon: <ContainerOutlined />,
        label: '内容NFT',
      },
    ],
  },
  {
    key: 'user-group',
    icon: <TeamOutlined />,
    label: '用户运营',
    children: [
      {
        key: '/admin/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
      {
        key: '/admin/users/kyc',
        icon: <IdcardOutlined />,
        label: 'KYC审核',
      },
      {
        key: '/admin/users/levels',
        icon: <CheckCircleOutlined />,
        label: '等级管理',
      },
      {
        key: '/admin/users/invite',
        icon: <UsergroupAddOutlined />,
        label: '邀请关系',
      },
    ],
  },
  {
    key: 'finance-group',
    icon: <DollarOutlined />,
    label: '财务中心',
    children: [
      {
        key: '/admin/finance/overview',
        icon: <BarChartOutlined />,
        label: '财务概览',
      },
      {
        key: '/admin/finance/revenue',
        icon: <AccountBookOutlined />,
        label: '收入统计',
      },
      {
        key: '/admin/finance/reconciliation',
        icon: <CheckCircleOutlined />,
        label: '对账管理',
      },
      {
        key: '/admin/finance/settlement',
        icon: <CreditCardOutlined />,
        label: '结算管理',
      },
    ],
  },
  {
    key: 'system-group',
    icon: <SettingOutlined />,
    label: '系统管理',
    children: [
      {
        key: '/admin/settings',
        icon: <SettingOutlined />,
        label: '系统设置',
      },
      {
        key: '/admin/settings/admins',
        icon: <UsergroupAddOutlined />,
        label: '管理员管理',
      },
      {
        key: '/admin/settings/roles',
        icon: <LockOutlined />,
        label: '权限管理',
      },
      {
        key: '/admin/audit-logs',
        icon: <HistoryOutlined />,
        label: '操作日志',
      },
      {
        key: '/admin/settings/server',
        icon: <CloudServerOutlined />,
        label: '服务器监控',
      },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="admin-layout-sider"
        width={240}
      >
        <div className="h-16 flex items-center justify-center border-b border-blue-800">
          {collapsed ? (
            <div className="text-white text-2xl font-bold">W</div>
          ) : (
            <div className="text-white text-xl font-bold">WOPC 创业家</div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <Dropdown menu={{ items: userMenuItems }}>
              <Space className="cursor-pointer">
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{user?.username || '管理员'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
