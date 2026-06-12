// ============================
// Route Constants
// ============================
export const ROUTES = {
  // App Tabs
  HOME: '/',
  DISCOVER: '/discover',
  SERVICES: '/services',
  AI_BRAIN: '/ai',
  PROFILE: '/profile',

  // Sub Pages
  TAX_CALCULATOR: '/tax-calculator',
  LEGAL_HUB: '/legal-hub',
  VIDEO_CENTER: '/video-center',
  VIDEO_PLAYER: '/video/:id',
  VIDEO_PLAYER_DYNAMIC: (id: string) => `/video/${id}`,
  MEDIA_CENTER: '/media-center',
  AI_CHAT_DETAIL: '/ai-chat/:agentId',
  AI_CHAT_DETAIL_DYNAMIC: (agentId: string) => `/ai-chat/${agentId}`,
  COMPANY_REGISTER: '/company-register',
  PAYMENT_CONSOLE: '/payment-console',
  BANK_ACCOUNT: '/bank-account',
  DLC_LEVEL: '/dlc-level',
  DOCUMENTS: '/documents',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',

  // Admin
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_COMPANIES: '/admin/companies',
  ADMIN_BANKS: '/admin/banks',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_AI_KNOWLEDGE: '/admin/ai-knowledge',
  ADMIN_TAX_RATES: '/admin/tax-rates',
  ADMIN_DLC: '/admin/dlc',
  ADMIN_DVSF: '/admin/dvsf',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

// ============================
// App Config
// ============================
export const APP_CONFIG = {
  name: '太初国链',
  tagline: '萨摩亚SPV × 海购星Dapp',
  version: '1.0.0',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  maxMobileWidth: 430,
  bottomNavHeight: 64,
  topBarHeight: 48,
} as const;

// ============================
// Bottom Nav Tabs
// ============================
export const NAV_TABS = [
  { id: 'home', label: '首页', icon: 'Home', path: ROUTES.HOME },
  { id: 'discover', label: '发现', icon: 'Compass', path: ROUTES.DISCOVER },
  { id: 'services', label: '服务', icon: 'Briefcase', path: ROUTES.SERVICES },
  { id: 'ai', label: 'AI', icon: 'Brain', path: ROUTES.AI_BRAIN },
  { id: 'profile', label: '我的', icon: 'User', path: ROUTES.PROFILE },
] as const;

// ============================
// DLC Levels
// ============================
export const DLC_LEVELS = [
  {
    level: 1,
    name: '青铜',
    color: '#CD7F32',
    minDvc: 0,
    maxDvc: 999,
    benefits: ['基础服务访问', '社区支持'],
    commissionRate: 0.05,
  },
  {
    level: 2,
    name: '白银',
    color: '#C0C0C0',
    minDvc: 1000,
    maxDvc: 4999,
    benefits: ['优先客服', '高级分析报告'],
    commissionRate: 0.08,
  },
  {
    level: 3,
    name: '黄金',
    color: '#FFD700',
    minDvc: 5000,
    maxDvc: 19999,
    benefits: ['专属顾问', '优先处理', '月度报告'],
    commissionRate: 0.12,
  },
  {
    level: 4,
    name: '铂金',
    color: '#E5E4E2',
    minDvc: 20000,
    maxDvc: 49999,
    benefits: ['VIP通道', '定制化服务', '季度策略会'],
    commissionRate: 0.15,
  },
  {
    level: 5,
    name: '钻石',
    color: '#B9F2FF',
    minDvc: 50000,
    maxDvc: 999999999,
    benefits: ['全功能解锁', '最高佣金', '私人银行服务'],
    commissionRate: 0.2,
  },
] as const;

// ============================
// Company Types
// ============================
export const COMPANY_TYPES = [
  { value: 'samoa_spv', label: '萨摩亚SPV', description: '特殊目的公司，税务优化' },
  { value: 'hong_kong', label: '香港公司', description: '国际金融中心，简单税制' },
  { value: 'singapore', label: '新加坡公司', description: '东南亚枢纽，创新友好' },
  { value: 'bvi', label: 'BVI公司', description: '英属维尔京群岛，隐私保护' },
  { value: 'cayman', label: '开曼公司', description: '免税天堂，上市架构' },
  { value: 'delaware', label: '特拉华公司', description: '美国首选，法律成熟' },
  { value: 'seychelles', label: '塞舌尔公司', description: '快速注册，成本低廉' },
] as const;

// ============================
// Countries for Tax/Legal
// ============================
export const COUNTRIES = [
  { code: 'US', name: '美国', currency: 'USD', flag: '🇺🇸' },
  { code: 'CN', name: '中国', currency: 'CNY', flag: '🇨🇳' },
  { code: 'HK', name: '中国香港', currency: 'HKD', flag: '🇭🇰' },
  { code: 'SG', name: '新加坡', currency: 'SGD', flag: '🇸🇬' },
  { code: 'GB', name: '英国', currency: 'GBP', flag: '🇬🇧' },
  { code: 'JP', name: '日本', currency: 'JPY', flag: '🇯🇵' },
  { code: 'DE', name: '德国', currency: 'EUR', flag: '🇩🇪' },
  { code: 'AU', name: '澳大利亚', currency: 'AUD', flag: '🇦🇺' },
  { code: 'CA', name: '加拿大', currency: 'CAD', flag: '🇨🇦' },
  { code: 'FR', name: '法国', currency: 'EUR', flag: '🇫🇷' },
  { code: 'NL', name: '荷兰', currency: 'EUR', flag: '🇳🇱' },
  { code: 'CH', name: '瑞士', currency: 'CHF', flag: '🇨🇭' },
  { code: 'AE', name: '阿联酋', currency: 'AED', flag: '🇦🇪' },
  { code: 'IN', name: '印度', currency: 'INR', flag: '🇮🇳' },
  { code: 'BR', name: '巴西', currency: 'BRL', flag: '🇧🇷' },
  { code: 'MX', name: '墨西哥', currency: 'MXN', flag: '🇲🇽' },
  { code: 'VN', name: '越南', currency: 'VND', flag: '🇻🇳' },
  { code: 'TH', name: '泰国', currency: 'THB', flag: '🇹🇭' },
  { code: 'MY', name: '马来西亚', currency: 'MYR', flag: '🇲🇾' },
  { code: 'ID', name: '印尼', currency: 'IDR', flag: '🇮🇩' },
  { code: 'PH', name: '菲律宾', currency: 'PHP', flag: '🇵🇭' },
  { code: 'WS', name: '萨摩亚', currency: 'WST', flag: '🇼🇸' },
  { code: 'KY', name: '开曼群岛', currency: 'KYD', flag: '🇰🇾' },
  { code: 'VG', name: '英属维尔京', currency: 'USD', flag: '🇻🇬' },
] as const;

// ============================
// Animation Defaults
// ============================
export const ANIMATION = {
  duration: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
    slower: 0.6,
  },
  easing: {
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeInOut: [0.65, 0, 0.35, 1] as const,
    spring: [0.34, 1.56, 0.64, 1] as const,
    linear: [0, 0, 1, 1] as const,
  },
  stagger: {
    fast: 0.04,
    normal: 0.06,
    slow: 0.1,
  },
} as const;

// ============================
// Page Titles
// ============================
export const PAGE_TITLES: Record<string, string> = {
  [ROUTES.HOME]: '首页',
  [ROUTES.DISCOVER]: '发现',
  [ROUTES.SERVICES]: '服务',
  [ROUTES.AI_BRAIN]: 'AI大脑',
  [ROUTES.PROFILE]: '我的',
  [ROUTES.TAX_CALCULATOR]: '税务计算器',
  [ROUTES.LEGAL_HUB]: '法务中台',
  [ROUTES.VIDEO_CENTER]: '视频中心',
  [ROUTES.MEDIA_CENTER]: '自媒体中心',
  [ROUTES.AI_CHAT_DETAIL]: 'AI对话',
  [ROUTES.COMPANY_REGISTER]: '公司注册',
  [ROUTES.PAYMENT_CONSOLE]: '全球收款',
  [ROUTES.BANK_ACCOUNT]: '银行开户',
  [ROUTES.DLC_LEVEL]: 'DLC等级',
  [ROUTES.DOCUMENTS]: '文档中心',
  [ROUTES.SETTINGS]: '设置',
  [ROUTES.NOTIFICATIONS]: '消息通知',
  [ROUTES.ADMIN_DASHBOARD]: '管理后台',
  [ROUTES.ADMIN_USERS]: '用户管理',
  [ROUTES.ADMIN_COMPANIES]: '公司订单',
  [ROUTES.ADMIN_BANKS]: '银行开户',
  [ROUTES.ADMIN_PAYMENTS]: '全球支付',
  [ROUTES.ADMIN_AI_KNOWLEDGE]: 'AI知识库',
  [ROUTES.ADMIN_TAX_RATES]: '税率数据库',
  [ROUTES.ADMIN_DLC]: 'DLC配置',
  [ROUTES.ADMIN_DVSF]: 'DVSF分红池',
  [ROUTES.ADMIN_SETTINGS]: '系统设置',
};

// ============================
// Toast Defaults
// ============================
export const TOAST_DEFAULTS = {
  duration: 4000,
  maxVisible: 3,
} as const;
