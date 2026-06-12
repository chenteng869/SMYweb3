'use client';

// WOPC 创业家 管理后台菜单与门户首页功能区域映射关系
export const adminMenuPortalMapping = {
  // 主菜单分组映射
  mainGroups: {
    '/admin/dashboard': {
      title: '数据中心',
      portalSection: 'dashboard',
      iconKey: 'dashboard',
      description: '平台核心数据概览与统计分析',
    },
    'web3-group': {
      title: 'Web3.0 管理',
      portalSection: 'web3',
      iconKey: 'thunderbolt',
      description: 'Web3 数据看板、DApp 接入管理、区块链监控',
    },
    'chain-group': {
      title: '公链管理',
      portalSection: 'chain',
      iconKey: 'global',
      description: '节点管理、区块浏览、链上治理、网络监控、跨链桥',
    },
    'cex-group': {
      title: 'CEX 交易所',
      portalSection: 'cex',
      iconKey: 'creditcard',
      description: '币币交易、合约交易、杠杆交易、订单管理、交易对配置、行情管理、风险控制',
    },
    'dex-group': {
      title: 'DEX 交易所',
      portalSection: 'dex',
      iconKey: 'swap',
      description: '流动性池、闪兑交易、流动性挖矿、交易对管理',
    },
    'defi-group': {
      title: 'DeFi 管理',
      portalSection: 'defi',
      iconKey: 'fund',
      description: '质押管理、流动性管理、收益分配',
    },
    'wallet-group': {
      title: 'Web3 钱包',
      portalSection: 'wallet',
      iconKey: 'wallet',
      description: '地址管理、资产监控、交易记录、NFT 资产、安全策略',
    },
    'staking-group': {
      title: '质押挖矿',
      portalSection: 'staking',
      iconKey: 'accountbook',
      description: '矿池管理、质押记录、收益发放、推荐关系、收益率配置',
    },
    'ido-group': {
      title: 'IDO/Launchpad',
      portalSection: 'ido',
      iconKey: 'rocket',
      description: '项目管理、白名单管理、申购管理、解锁计划、代币发放',
    },
    'quant-group': {
      title: '量化交易',
      portalSection: 'quant',
      iconKey: 'barchart',
      description: '策略管理、策略回测、跟单订阅、绩效监控、风险控制',
    },
    'entertainment-group': {
      title: '娱乐游戏',
      portalSection: 'entertainment',
      iconKey: 'trophy',
      description: '幸运抽奖、盲盒系统、竞技游戏、奖品管理、中奖记录',
    },
    'ecommerce-group': {
      title: '电商商城',
      portalSection: 'ecommerce',
      iconKey: 'shop',
      description: '商品管理、订单管理、库存管理、物流配置、财务管理',
    },
    'content-group': {
      title: '国学内容',
      portalSection: 'content',
      iconKey: 'filetext',
      description: '国学动漫、真人短剧、非遗内容、内容审核、内容 NFT',
    },
    'user-group': {
      title: '用户运营',
      portalSection: 'user',
      iconKey: 'team',
      description: '用户管理、KYC 审核、等级管理、邀请关系',
    },
    'finance-group': {
      title: '财务中心',
      portalSection: 'finance',
      iconKey: 'dollar',
      description: '财务概览、收入统计、对账管理、结算管理',
    },
    'system-group': {
      title: '系统管理',
      portalSection: 'system',
      iconKey: 'setting',
      description: '系统设置、管理员管理、权限管理、操作日志、服务器监控',
    },
  },

  // 子菜单详细映射
  subMenuItems: {
    // Web3.0 管理
    '/admin/web3/dashboard': {
      title: 'Web3 数据看板',
      portalSection: 'web3-dashboard',
      group: 'web3-group',
    },
    '/admin/web3/dapps': {
      title: 'DApp 接入管理',
      portalSection: 'web3-dapps',
      group: 'web3-group',
    },
    '/admin/web3/blockchain': {
      title: '区块链监控',
      portalSection: 'web3-blockchain',
      group: 'web3-group',
    },

    // 公链管理
    '/admin/chain/nodes': {
      title: '节点管理',
      portalSection: 'chain-nodes',
      group: 'chain-group',
    },
    '/admin/chain/explorer': {
      title: '区块浏览',
      portalSection: 'chain-explorer',
      group: 'chain-group',
    },
    '/admin/chain/governance': {
      title: '链上治理',
      portalSection: 'chain-governance',
      group: 'chain-group',
    },
    '/admin/chain/monitor': {
      title: '网络监控',
      portalSection: 'chain-monitor',
      group: 'chain-group',
    },
    '/admin/chain/bridge': {
      title: '跨链桥',
      portalSection: 'chain-bridge',
      group: 'chain-group',
    },

    // CEX 交易所
    '/admin/cex/spot': {
      title: '币币交易',
      portalSection: 'cex-spot',
      group: 'cex-group',
    },
    '/admin/cex/futures': {
      title: '合约交易',
      portalSection: 'cex-futures',
      group: 'cex-group',
    },
    '/admin/cex/leverage': {
      title: '杠杆交易',
      portalSection: 'cex-leverage',
      group: 'cex-group',
    },
    '/admin/cex/orders': {
      title: '订单管理',
      portalSection: 'cex-orders',
      group: 'cex-group',
    },
    '/admin/cex/pairs': {
      title: '交易对配置',
      portalSection: 'cex-pairs',
      group: 'cex-group',
    },
    '/admin/cex/market': {
      title: '行情管理',
      portalSection: 'cex-market',
      group: 'cex-group',
    },
    '/admin/cex/risk': {
      title: '风险控制',
      portalSection: 'cex-risk',
      group: 'cex-group',
    },

    // DEX 交易所
    '/admin/dex/pools': {
      title: '流动性池',
      portalSection: 'dex-pools',
      group: 'dex-group',
    },
    '/admin/dex/swap': {
      title: '闪兑交易',
      portalSection: 'dex-swap',
      group: 'dex-group',
    },
    '/admin/dex/farming': {
      title: '流动性挖矿',
      portalSection: 'dex-farming',
      group: 'dex-group',
    },
    '/admin/dex/pairs': {
      title: '交易对管理',
      portalSection: 'dex-pairs',
      group: 'dex-group',
    },

    // DeFi 管理
    '/admin/defi/staking': {
      title: '质押管理',
      portalSection: 'defi-staking',
      group: 'defi-group',
    },
    '/admin/defi/liquidity': {
      title: '流动性管理',
      portalSection: 'defi-liquidity',
      group: 'defi-group',
    },
    '/admin/defi/rewards': {
      title: '收益分配',
      portalSection: 'defi-rewards',
      group: 'defi-group',
    },

    // Web3 钱包
    '/admin/wallet/addresses': {
      title: '地址管理',
      portalSection: 'wallet-addresses',
      group: 'wallet-group',
    },
    '/admin/wallet/assets': {
      title: '资产监控',
      portalSection: 'wallet-assets',
      group: 'wallet-group',
    },
    '/admin/wallet/transactions': {
      title: '交易记录',
      portalSection: 'wallet-transactions',
      group: 'wallet-group',
    },
    '/admin/wallet/nfts': {
      title: 'NFT 资产',
      portalSection: 'wallet-nfts',
      group: 'wallet-group',
    },
    '/admin/wallet/security': {
      title: '安全策略',
      portalSection: 'wallet-security',
      group: 'wallet-group',
    },

    // 质押挖矿
    '/admin/staking/pools': {
      title: '矿池管理',
      portalSection: 'staking-pools',
      group: 'staking-group',
    },
    '/admin/staking/records': {
      title: '质押记录',
      portalSection: 'staking-records',
      group: 'staking-group',
    },
    '/admin/staking/rewards': {
      title: '收益发放',
      portalSection: 'staking-rewards',
      group: 'staking-group',
    },
    '/admin/staking/referral': {
      title: '推荐关系',
      portalSection: 'staking-referral',
      group: 'staking-group',
    },
    '/admin/staking/config': {
      title: '收益率配置',
      portalSection: 'staking-config',
      group: 'staking-group',
    },

    // IDO/Launchpad
    '/admin/ido/projects': {
      title: '项目管理',
      portalSection: 'ido-projects',
      group: 'ido-group',
    },
    '/admin/ido/whitelist': {
      title: '白名单管理',
      portalSection: 'ido-whitelist',
      group: 'ido-group',
    },
    '/admin/ido/subscriptions': {
      title: '申购管理',
      portalSection: 'ido-subscriptions',
      group: 'ido-group',
    },
    '/admin/ido/unlock': {
      title: '解锁计划',
      portalSection: 'ido-unlock',
      group: 'ido-group',
    },
    '/admin/ido/distribution': {
      title: '代币发放',
      portalSection: 'ido-distribution',
      group: 'ido-group',
    },

    // 量化交易
    '/admin/quant/strategies': {
      title: '策略管理',
      portalSection: 'quant-strategies',
      group: 'quant-group',
    },
    '/admin/quant/backtest': {
      title: '策略回测',
      portalSection: 'quant-backtest',
      group: 'quant-group',
    },
    '/admin/quant/subscriptions': {
      title: '跟单订阅',
      portalSection: 'quant-subscriptions',
      group: 'quant-group',
    },
    '/admin/quant/performance': {
      title: '绩效监控',
      portalSection: 'quant-performance',
      group: 'quant-group',
    },
    '/admin/quant/risk': {
      title: '风险控制',
      portalSection: 'quant-risk',
      group: 'quant-group',
    },

    // 娱乐游戏
    '/admin/entertainment/lottery': {
      title: '幸运抽奖',
      portalSection: 'entertainment-lottery',
      group: 'entertainment-group',
    },
    '/admin/entertainment/blindbox': {
      title: '盲盒系统',
      portalSection: 'entertainment-blindbox',
      group: 'entertainment-group',
    },
    '/admin/entertainment/games': {
      title: '竞技游戏',
      portalSection: 'entertainment-games',
      group: 'entertainment-group',
    },
    '/admin/entertainment/prizes': {
      title: '奖品管理',
      portalSection: 'entertainment-prizes',
      group: 'entertainment-group',
    },
    '/admin/entertainment/records': {
      title: '中奖记录',
      portalSection: 'entertainment-records',
      group: 'entertainment-group',
    },

    // 电商商城
    '/admin/ecommerce/products': {
      title: '商品管理',
      portalSection: 'ecommerce-products',
      group: 'ecommerce-group',
    },
    '/admin/ecommerce/orders': {
      title: '订单管理',
      portalSection: 'ecommerce-orders',
      group: 'ecommerce-group',
    },
    '/admin/ecommerce/inventory': {
      title: '库存管理',
      portalSection: 'ecommerce-inventory',
      group: 'ecommerce-group',
    },
    '/admin/ecommerce/logistics': {
      title: '物流配置',
      portalSection: 'ecommerce-logistics',
      group: 'ecommerce-group',
    },
    '/admin/ecommerce/finance': {
      title: '财务管理',
      portalSection: 'ecommerce-finance',
      group: 'ecommerce-group',
    },

    // 国学内容
    '/admin/content/animation': {
      title: '国学动漫',
      portalSection: 'content-animation',
      group: 'content-group',
    },
    '/admin/content/drama': {
      title: '真人短剧',
      portalSection: 'content-drama',
      group: 'content-group',
    },
    '/admin/content/heritage': {
      title: '非遗内容',
      portalSection: 'content-heritage',
      group: 'content-group',
    },
    '/admin/content/audit': {
      title: '内容审核',
      portalSection: 'content-audit',
      group: 'content-group',
    },
    '/admin/content/nft': {
      title: '内容 NFT',
      portalSection: 'content-nft',
      group: 'content-group',
    },

    // 用户运营
    '/admin/users': {
      title: '用户管理',
      portalSection: 'user-management',
      group: 'user-group',
    },
    '/admin/users/kyc': {
      title: 'KYC 审核',
      portalSection: 'user-kyc',
      group: 'user-group',
    },
    '/admin/users/levels': {
      title: '等级管理',
      portalSection: 'user-levels',
      group: 'user-group',
    },
    '/admin/users/invite': {
      title: '邀请关系',
      portalSection: 'user-invite',
      group: 'user-group',
    },

    // 财务中心
    '/admin/finance/overview': {
      title: '财务概览',
      portalSection: 'finance-overview',
      group: 'finance-group',
    },
    '/admin/finance/revenue': {
      title: '收入统计',
      portalSection: 'finance-revenue',
      group: 'finance-group',
    },
    '/admin/finance/reconciliation': {
      title: '对账管理',
      portalSection: 'finance-reconciliation',
      group: 'finance-group',
    },
    '/admin/finance/settlement': {
      title: '结算管理',
      portalSection: 'finance-settlement',
      group: 'finance-group',
    },

    // 系统管理
    '/admin/settings': {
      title: '系统设置',
      portalSection: 'system-settings',
      group: 'system-group',
    },
    '/admin/settings/admins': {
      title: '管理员管理',
      portalSection: 'system-admins',
      group: 'system-group',
    },
    '/admin/settings/roles': {
      title: '权限管理',
      portalSection: 'system-roles',
      group: 'system-group',
    },
    '/admin/audit-logs': {
      title: '操作日志',
      portalSection: 'system-logs',
      group: 'system-group',
    },
    '/admin/settings/server': {
      title: '服务器监控',
      portalSection: 'system-server',
      group: 'system-group',
    },
  },
};

// 门户首页模块顺序配置
export const portalModulesOrder = [
  'dashboard',
  'web3',
  'chain',
  'cex',
  'dex',
  'defi',
  'wallet',
  'staking',
  'ido',
  'quant',
  'entertainment',
  'ecommerce',
  'content',
  'user',
  'finance',
  'system',
];

// 获取门户首页功能区域配置
export function getPortalModuleConfig(sectionKey: string) {
  const groupMapping = adminMenuPortalMapping.mainGroups;
  return Object.values(groupMapping).find((item) => item.portalSection === sectionKey);
}

// 管理员后台菜单分组列表
export const adminMenuGroups = Object.keys(adminMenuPortalMapping.mainGroups);
