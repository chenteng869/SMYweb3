'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Avatar, Dropdown, Button, Space, theme } from 'antd';
import {
  HomeOutlined,
  WalletOutlined,
  SwapOutlined,
  FundOutlined,
  TrophyOutlined,
  UserOutlined,
  SafetyOutlined,
  HistoryOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SettingOutlined,
  LogoutOutlined,
  BarChartOutlined,
  AccountBookOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

interface UserLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    key: '/user/dashboard',
    icon: <HomeOutlined />,
    label: '首页概览',
  },
  {
    key: 'wallet-group',
    icon: <WalletOutlined />,
    label: '钱包管理',
    children: [
      {
        key: '/user/wallet/assets',
        icon: <BarChartOutlined />,
        label: '资产概览',
      },
      {
        key: '/user/wallet/transactions',
        icon: <HistoryOutlined />,
        label: '交易记录',
      },
      {
        key: '/user/wallet/deposit',
        icon: <FundOutlined />,
        label: '充值',
      },
      {
        key: '/user/wallet/withdraw',
        icon: <AccountBookOutlined />,
        label: '提现',
      },
    ],
  },
  {
    key: 'defi-group',
    icon: <FundOutlined />,
    label: 'DeFi中心',
    children: [
      {
        key: '/user/defi/swap',
        icon: <SwapOutlined />,
        label: '闪兑交易',
      },
      {
        key: '/user/defi/staking',
        icon: <AccountBookOutlined />,
        label: '质押挖矿',
      },
      {
        key: '/user/defi/farming',
        icon: <TrophyOutlined />,
        label: '流动性挖矿',
      },
      {
        key: '/user/defi/lending',
        icon: <SafetyOutlined />,
        label: '借贷',
      },
    ],
  },
  {
    key: 'trading-group',
    icon: <SwapOutlined />,
    label: '交易中心',
    children: [
      {
        key: '/user/trading/spot',
        icon: <ShoppingCartOutlined />,
        label: '币币交易',
      },
      {
        key: '/user/trading/orders',
        icon: <HistoryOutlined />,
        label: '订单管理',
      },
    ],
  },
  {
    key: 'ido-group',
    icon: <GiftOutlined />,
    label: 'IDO申购',
    children: [
      {
        key: '/user/ido/projects',
        icon: <GiftOutlined />,
        label: '项目列表',
      },
      {
        key: '/user/ido/subscriptions',
        icon: <HistoryOutlined />,
        label: '申购记录',
      },
    ],
  },
  {
    key: 'nft-group',
    icon: <TrophyOutlined />,
    label: 'NFT市场',
    children: [
      {
        key: '/user/nft/my-nfts',
        icon: <GiftOutlined />,
        label: '我的NFT',
      },
      {
        key: '/user/nft/market',
        icon: <ShoppingCartOutlined />,
        label: '市场浏览',
      },
    ],
  },
  {
    key: 'account-group',
    icon: <UserOutlined />,
    label: '账户设置',
    children: [
      {
        key: '/user/account/profile',
        icon: <UserOutlined />,
        label: '个人资料',
      },
      {
        key: '/user/account/security',
        icon: <SafetyOutlined />,
        label: '安全设置',
      },
      {
        key: '/user/account/kyc',
        icon: <UserOutlined />,
        label: 'KYC认证',
      },
      {
        key: '/user/account/referral',
        icon: <UserOutlined />,
        label: '邀请好友',
      },
    ],
  },
];

export default function UserLayout({ children }: UserLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const userMenuItems: any[] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => router.push('/user/account/profile'),
    },
    {
      key: 'security',
      label: '安全设置',
      icon: <SafetyOutlined />,
      onClick: () => router.push('/user/account/security'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="user-layout-sider"
        width={240}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          {collapsed ? (
            <div className="text-white text-2xl font-bold">国</div>
          ) : (
            <div className="text-white text-xl font-bold">国学dapp</div>
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
                <span>用户</span>
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
