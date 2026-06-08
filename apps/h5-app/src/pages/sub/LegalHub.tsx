import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, FileText, AlertTriangle, CheckCircle, Globe,
  ArrowLeft, Search, XCircle, ShieldCheck, ShieldAlert,
  Handshake, Users, Lock, Home, Key,
  Sparkles, Download,
  Clock, FileCheck, CheckSquare, Square, Upload
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import { usePageTitle } from '@/hooks/usePageTitle';

// ─── Types ───────────────────────────────────────────
type TabKey = 'compliance' | 'contract' | 'sanctions';
type ContractScenario = 'b2c' | 'b2b' | 'saas' | 'logistics' | 'employment' | 'custom' | null;
type ScreenStatus = 'idle' | 'clear' | 'warning' | 'highrisk';

interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  status: 'full' | 'partial' | 'restricted';
  score: number;
  mandatory: { text: string; done: boolean }[];
  recommended: { text: string; done: boolean }[];
  scoreBreakdown: { label: string; score: number; color: string }[];
}

interface ContractType {
  key: ContractScenario;
  label: string;
  desc: string;
  icon: React.ElementType;
}

interface ScreeningHistoryItem {
  name: string;
  result: 'clear' | 'warning' | 'highrisk';
  time: string;
}

// ─── Mock Data ───────────────────────────────────────
const CONTRACT_TYPES: ContractType[] = [
  { key: 'b2c', label: 'B2C电商', desc: '消费者销售协议', icon: Handshake },
  { key: 'b2b', label: 'B2B批发', desc: '企业间供货合同', icon: Users },
  { key: 'saas', label: 'SaaS订阅', desc: '软件服务协议', icon: Lock },
  { key: 'logistics', label: '物流服务', desc: '运输仓储合同', icon: Home },
  { key: 'employment', label: '雇佣合同', desc: '员工/顾问协议', icon: Users },
  { key: 'custom', label: '定制', desc: '自定义合同', icon: Key },
];

const COUNTRY_DATA: Record<string, CountryInfo> = {
  TH: {
    code: 'TH', name: '泰国', flag: '🇹🇭', status: 'full', score: 85,
    mandatory: [
      { text: 'PDPA个人数据保护法', done: true },
      { text: '电商法 (E-Commerce Act)', done: true },
      { text: '7% VAT', done: true },
      { text: '14天无理由退货', done: true },
      { text: '产品标签要求 (泰文)', done: true },
    ],
    recommended: [
      { text: '注册商标', done: false },
      { text: '本地代理', done: false },
    ],
    scoreBreakdown: [
      { label: '数据', score: 90, color: '#00D4AA' },
      { label: '税务', score: 80, color: '#60A5FA' },
      { label: '产品', score: 85, color: '#F6A623' },
      { label: '知识产权', score: 75, color: '#A78BFA' },
    ],
  },
  SG: {
    code: 'SG', name: '新加坡', flag: '🇸🇬', status: 'full', score: 95,
    mandatory: [
      { text: 'PDPA个人数据保护法', done: true },
      { text: 'GST消费税注册', done: true },
      { text: '公司秘书任命', done: true },
      { text: '年度审计', done: true },
    ],
    recommended: [
      { text: '本地董事', done: true },
      { text: '商标保护', done: false },
    ],
    scoreBreakdown: [
      { label: '数据', score: 95, color: '#00D4AA' },
      { label: '税务', score: 95, color: '#60A5FA' },
      { label: '产品', score: 90, color: '#F6A623' },
      { label: '知识产权', score: 95, color: '#A78BFA' },
    ],
  },
  VN: {
    code: 'VN', name: '越南', flag: '🇻🇳', status: 'partial', score: 72,
    mandatory: [
      { text: '网络安全法', done: true },
      { text: '电商注册', done: false },
      { text: '10% VAT', done: true },
    ],
    recommended: [
      { text: '本地代表处', done: false },
      { text: '知识产权登记', done: false },
    ],
    scoreBreakdown: [
      { label: '数据', score: 75, color: '#00D4AA' },
      { label: '税务', score: 70, color: '#60A5FA' },
      { label: '产品', score: 70, color: '#F6A623' },
      { label: '知识产权', score: 65, color: '#A78BFA' },
    ],
  },
  US: {
    code: 'US', name: '美国', flag: '🇺🇸', status: 'full', score: 90,
    mandatory: [
      { text: 'CCPA/CPRA隐私法', done: true },
      { text: 'EIN税号', done: true },
      { text: 'BOI报告', done: true },
      { text: '销售税 (各州不同)', done: true },
    ],
    recommended: [
      { text: '注册商标 (USPTO)', done: false },
      { text: '产品责任保险', done: false },
    ],
    scoreBreakdown: [
      { label: '数据', score: 85, color: '#00D4AA' },
      { label: '税务', score: 90, color: '#60A5FA' },
      { label: '产品', score: 90, color: '#F6A623' },
      { label: '知识产权', score: 90, color: '#A78BFA' },
    ],
  },
  CN: {
    code: 'CN', name: '中国', flag: '🇨🇳', status: 'full', score: 88,
    mandatory: [
      { text: '个人信息保护法 (PIPL)', done: true },
      { text: '数据安全法', done: true },
      { text: '13% 增值税', done: true },
      { text: 'ICP备案', done: true },
    ],
    recommended: [
      { text: '等保测评', done: false },
      { text: '软件著作权', done: true },
    ],
    scoreBreakdown: [
      { label: '数据', score: 85, color: '#00D4AA' },
      { label: '税务', score: 90, color: '#60A5FA' },
      { label: '产品', score: 88, color: '#F6A623' },
      { label: '知识产权', score: 85, color: '#A78BFA' },
    ],
  },
};

const SCREENING_HISTORY: ScreeningHistoryItem[] = [
  { name: 'ABC Trading Ltd', result: 'clear', time: '2026-06-05 14:32' },
  { name: 'Global Shipping Co', result: 'warning', time: '2026-06-05 11:15' },
  { name: '陈某某', result: 'clear', time: '2026-06-04 09:45' },
  { name: 'XYZ Maritime', result: 'highrisk', time: '2026-06-03 16:20' },
  { name: 'Pacific Logistics', result: 'clear', time: '2026-06-03 10:08' },
];

const DB_COVERAGE = [
  { name: 'OFAC', count: '35,000+', color: '#00D4AA' },
  { name: 'UN', count: '8,000+', color: '#60A5FA' },
  { name: 'EU', count: '12,000+', color: '#A78BFA' },
  { name: 'HMT', count: '5,000+', color: '#F6A623' },
  { name: '中国', count: '2,000+', color: '#EF4444' },
];

const CONTRACT_TABS = [
  { key: 'tos', label: '服务条款' },
  { key: 'privacy', label: '隐私政策' },
  { key: 'refund', label: '退款政策' },
];

// ─── Simplified World Map SVG ────────────────────────
const WORLD_MAP_PATHS = [
  // North America (simplified)
  { d: 'M30,35 L80,30 L100,45 L90,80 L60,85 L35,70 Z', code: 'US', label: '美国' },
  // South America
  { d: 'M55,90 L80,95 L85,130 L65,140 L50,120 Z', code: 'BR', label: '巴西' },
  // Europe
  { d: 'M145,32 L175,28 L185,45 L170,55 L150,50 Z', code: 'EU', label: '欧盟' },
  // Africa
  { d: 'M140,65 L175,60 L185,100 L160,120 L135,100 Z', code: 'NG', label: '尼日利亚' },
  // Middle East
  { d: 'M155,55 L175,50 L180,65 L160,70 Z', code: 'SA', label: '沙特' },
  // Asia - China
  { d: 'M200,35 L240,30 L250,55 L230,65 L205,55 Z', code: 'CN', label: '中国' },
  // Southeast Asia
  { d: 'M215,60 L240,58 L245,75 L225,80 Z', code: 'TH', label: '泰国' },
  // Australia
  { d: 'M230,100 L265,95 L270,120 L240,125 Z', code: 'AU', label: '澳洲' },
  // Japan
  { d: 'M255,38 L265,35 L268,55 L258,58 Z', code: 'JP', label: '日本' },
  // India
  { d: 'M190,55 L210,50 L215,80 L195,85 Z', code: 'IN', label: '印度' },
  // Singapore
  { d: 'M225,78 L232,76 L233,82 L226,83 Z', code: 'SG', label: '新加坡' },
  // Vietnam
  { d: 'M220,62 L228,60 L230,72 L222,74 Z', code: 'VN', label: '越南' },
];

const MAP_COUNTRY_META: Record<string, { fill: string; status: 'full' | 'partial' | 'restricted' }> = {
  US: { fill: '#00D4AA', status: 'full' },
  CN: { fill: '#00D4AA', status: 'full' },
  TH: { fill: '#00D4AA', status: 'full' },
  SG: { fill: '#00D4AA', status: 'full' },
  VN: { fill: '#F6A623', status: 'partial' },
  JP: { fill: '#00D4AA', status: 'full' },
  IN: { fill: '#F6A623', status: 'partial' },
  AU: { fill: '#00D4AA', status: 'full' },
  EU: { fill: '#00D4AA', status: 'full' },
  SA: { fill: '#00D4AA', status: 'full' },
  BR: { fill: '#F6A623', status: 'partial' },
  NG: { fill: '#EF4444', status: 'restricted' },
};

// ─── Main Component ──────────────────────────────────
export default function LegalHub() {
  usePageTitle('法务中台');
  const [activeTab, setActiveTab] = useState<TabKey>('compliance');

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'compliance', label: '合规地图', icon: Globe },
    { key: 'contract', label: 'AI合同', icon: FileText },
    { key: 'sanctions', label: '制裁筛查', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="法务中台" showBack />

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-4 mt-4 rounded-lg p-5 bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent"
      >
        <Shield size={24} className="text-blue-400 mb-2" />
        <h1 className="text-2xl font-bold text-text-primary">法务中台</h1>
        <p className="text-[15px] text-text-secondary mt-1">全球合规 × AI法务 · 7×24小时守护</p>
      </motion.div>

      {/* ── Top Tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="sticky top-[env(safe-area-inset-top)] z-30 mt-4 mx-4 rounded-md bg-bg-card/95 backdrop-blur-md border border-white/[0.08]"
      >
        <div className="flex h-12">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[14px] font-medium transition-all relative ${
                activeTab === tab.key ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="legal-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-[2px] bg-blue-400 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Tab Content ── */}
      <div className="px-4 pt-4 pb-6">
        <AnimatePresence mode="wait">
          {activeTab === 'compliance' && <ComplianceMapTab key="compliance" />}
          {activeTab === 'contract' && <ContractTab key="contract" />}
          {activeTab === 'sanctions' && <SanctionsTab key="sanctions" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 1: Compliance Map
// ══════════════════════════════════════════════════════
function ComplianceMapTab() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const selectedData = selectedCountry ? COUNTRY_DATA[selectedCountry] : null;

  const overviewCards = [
    { icon: CheckCircle, title: '合规国家', value: '150+', color: 'text-teal', bg: 'bg-teal/15' },
    { icon: FileCheck, title: '合规框架', value: 'FATF/OECD', color: 'text-blue-400', bg: 'bg-blue-400/15' },
    { icon: Clock, title: '监控频率', value: '实时', color: 'text-coral', bg: 'bg-coral/15' },
    { icon: AlertTriangle, title: '待处理预警', value: '0', color: 'text-teal', bg: 'bg-teal/15' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {overviewCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="bg-bg-card border border-white/[0.08] rounded-md p-3"
          >
            <div className={`w-8 h-8 rounded-md ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="font-display text-lg font-semibold text-text-primary">{card.value}</p>
            <p className="text-caption text-text-muted">{card.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Interactive Map */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-bg-card border border-white/[0.08] rounded-lg p-4"
      >
        <h3 className="text-body font-medium text-text-primary mb-3 flex items-center gap-2">
          <Globe size={16} className="text-coral" />
          全球合规覆盖
        </h3>
        <div className="relative aspect-[2/1] bg-bg-elevated rounded-md overflow-hidden">
          <svg viewBox="0 0 300 160" className="w-full h-full">
            {/* Ocean bg */}
            <rect width="300" height="160" fill="rgba(20,26,42,0.6)" />
            {/* Map paths */}
            {WORLD_MAP_PATHS.map((region) => {
              const meta = MAP_COUNTRY_META[region.code];
              return (
                <g
                  key={region.code}
                  className="cursor-pointer"
                  onClick={() => {
                    if (COUNTRY_DATA[region.code]) {
                      setSelectedCountry(region.code);
                    }
                  }}
                >
                  <path
                    d={region.d}
                    fill={meta ? `${meta.fill}33` : 'rgba(255,255,255,0.06)'}
                    stroke={meta ? `${meta.fill}66` : 'rgba(255,255,255,0.08)'}
                    strokeWidth="0.5"
                    className="transition-all hover:opacity-80"
                  >
                    <title>{region.label}</title>
                  </path>
                  {meta && (
                    <circle
                      cx={parseFloat(region.d.split(' ')[0].slice(1)) + 10}
                      cy={parseFloat(region.d.split(' ')[1]) + 5}
                      r="2.5"
                      fill={meta.fill}
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {[
            { color: '#00D4AA', label: '已覆盖' },
            { color: '#F6A623', label: '部分覆盖' },
            { color: '#EF4444', label: '未覆盖' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Country Detail Panel */}
      <AnimatePresence>
        {selectedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-bg-card border border-white/[0.08] rounded-lg p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedData.flag}</span>
                <div>
                  <h3 className="text-body font-medium text-text-primary">{selectedData.name}</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    selectedData.status === 'full'
                      ? 'bg-teal/15 text-teal'
                      : selectedData.status === 'partial'
                      ? 'bg-yellow-500/15 text-yellow-500'
                      : 'bg-red-500/15 text-red-500'
                  }`}>
                    {selectedData.status === 'full' ? '已覆盖' : selectedData.status === 'partial' ? '部分覆盖' : '受限'}
                  </span>
                </div>
              </div>
              {/* Score Ring */}
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={selectedData.score >= 85 ? '#00D4AA' : selectedData.score >= 70 ? '#F6A623' : '#EF4444'}
                    strokeWidth="3"
                    strokeDasharray={`${selectedData.score * 0.94} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[13px] font-bold text-text-primary">{selectedData.score}</span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="flex gap-2 mb-4">
              {selectedData.scoreBreakdown.map((item) => (
                <div key={item.label} className="flex-1 text-center">
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.score}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">{item.label}</span>
                  <span className="text-[10px] ml-0.5" style={{ color: item.color }}>{item.score}</span>
                </div>
              ))}
            </div>

            {/* Mandatory Requirements */}
            <div className="mb-3">
              <p className="text-[12px] font-medium text-text-primary mb-2">强制要求清单</p>
              <div className="space-y-1.5">
                {selectedData.mandatory.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <CheckSquare size={14} className="text-teal shrink-0" />
                    <span className="text-[12px] text-text-secondary">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recommended */}
            <div className="mb-4">
              <p className="text-[12px] font-medium text-text-primary mb-2">推荐合规</p>
              <div className="space-y-1.5">
                {selectedData.recommended.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <Square size={14} className="text-text-muted shrink-0" />
                    <span className="text-[12px] text-text-muted">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 h-10 rounded-md bg-coral/15 text-coral text-[13px] font-medium flex items-center justify-center gap-1.5 hover:bg-coral/20 transition-colors">
                <FileCheck size={14} />
                生成合规检查清单
              </button>
              <button className="flex-1 h-10 rounded-md bg-blue-400/15 text-blue-400 text-[13px] font-medium flex items-center justify-center gap-1.5 hover:bg-blue-400/20 transition-colors">
                <Download size={14} />
                生成隐私政策
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Select Countries */}
      <div className="flex gap-2 flex-wrap">
        {Object.values(COUNTRY_DATA).map((country) => (
          <button
            key={country.code}
            onClick={() => setSelectedCountry(country.code)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-all ${
              selectedCountry === country.code
                ? 'border-coral bg-coral/15 text-coral'
                : 'border-white/[0.08] bg-bg-card text-text-secondary hover:text-text-primary'
            }`}
          >
            {country.flag} {country.name}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 2: AI Contract Generator
// ══════════════════════════════════════════════════════
function ContractTab() {
  const [selectedScenario, setSelectedScenario] = useState<ContractScenario>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [contractTab, setContractTab] = useState('tos');
  const [genStep, setGenStep] = useState(0);

  const genSteps = ['分析需求', '检索法规', '生成条款', '合规审查', '完成'];

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenStep(0);
    const interval = setInterval(() => {
      setGenStep((prev) => {
        if (prev >= genSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGenerating(false);
            setGenerated(true);
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
  };

  const generatedText = {
    tos: `服务条款 (Terms of Service)\n\n1. 服务范围\n服务商同意向客户提供的SaaS服务包括但不限于：软件访问、技术支持、数据备份等服务内容。\n\n2. 服务期限\n本协议自双方签署之日起生效，有效期为一年。期满前30天，任何一方可书面通知对方终止或续约。\n\n3. 费用与支付\n客户应按月支付服务费用。逾期付款将产生每日0.05%的滞纳金。\n\n4. 数据保护\n服务商承诺遵守适用的数据保护法律法规，包括但不限于GDPR、CCPA等。\n\n5. 知识产权\n服务商保留所有软件的知识产权。客户仅获得有限的使用许可。\n\n6. 责任限制\n服务商的累计赔偿责任不超过客户在过去12个月内支付的总费用。\n\n7. 争议解决\n本协议适用中华人民共和国法律。争议应首先通过友好协商解决。`,
    privacy: `隐私政策 (Privacy Policy)\n\n1. 信息收集\n我们可能收集以下类型的个人信息：姓名、邮箱、电话、公司信息、使用数据等。\n\n2. 信息使用\n我们使用收集的信息来提供服务、改进产品、发送通知等。\n\n3. 信息共享\n我们不会将您的个人信息出售给第三方。仅在法律要求或服务必要时共享。\n\n4. 数据安全\n我们采用行业标准的安全措施保护您的数据，包括加密、访问控制等。\n\n5. 用户权利\n您有权访问、更正、删除您的个人信息，以及撤回同意。`,
    refund: `退款政策 (Refund Policy)\n\n1. 退款条件\n客户在订阅后14天内可申请全额退款。超过14天按剩余期限比例退款。\n\n2. 不可退款情况\n已使用的增值服务、定制开发费用、培训费用不予退款。\n\n3. 退款流程\n客户需通过官方渠道提交退款申请，我们将在7个工作日内审核并处理。\n\n4. 退款方式\n退款将原路返回至客户的支付账户，处理时间取决于支付机构。`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {!selectedScenario ? (
        /* Scenario Selection */
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {CONTRACT_TYPES.map((type, i) => (
              <motion.button
                key={type.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedScenario(type.key)}
                className="bg-bg-card border border-white/[0.08] rounded-md p-3.5 text-left hover:border-coral/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-coral/15 flex items-center justify-center mb-2">
                  <type.icon size={18} className="text-coral" />
                </div>
                <p className="text-[14px] font-medium text-text-primary">{type.label}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{type.desc}</p>
              </motion.button>
            ))}
          </div>

          {/* Recent Contracts */}
          <Card variant="default" padding="md">
            <h3 className="text-body font-medium text-text-primary mb-3 flex items-center gap-2">
              <Clock size={15} className="text-coral" />
              最近生成
            </h3>
            <div className="space-y-2">
              {[
                { name: 'B2C电商服务协议', date: '2026-06-04', status: '已完成' },
                { name: 'SaaS订阅合同', date: '2026-06-03', status: '已签署' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-md bg-bg-elevated">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-[13px] text-text-primary">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-text-muted">{item.date}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        /* Contract Form & Generation */
        <>
          <button
            onClick={() => { setSelectedScenario(null); setGenerated(false); }}
            className="text-[13px] text-coral flex items-center gap-1 hover:underline"
          >
            <ArrowLeft size={14} />
            返回选择
          </button>

          {!generated ? (
            <>
              <Card variant="default" padding="lg">
                <h3 className="text-body font-medium text-text-primary mb-4">合同信息</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] text-text-muted mb-1 block">公司英文名</label>
                    <input
                      className="w-full h-11 px-3 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-[13px] focus:outline-none focus:border-coral/40"
                      placeholder="e.g. Taichu Global Ltd"
                      defaultValue="Taichu Global Ltd"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-text-muted mb-1 block">业务类型</label>
                    <input
                      className="w-full h-11 px-3 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-[13px] focus:outline-none focus:border-coral/40"
                      placeholder="e.g. 跨境电商"
                      defaultValue="跨境电商"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-text-muted mb-1 block">目标国家</label>
                    <select className="w-full h-11 px-3 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-[13px] focus:outline-none focus:border-coral/40">
                      <option>泰国</option>
                      <option>新加坡</option>
                      <option>越南</option>
                      <option>美国</option>
                      <option>欧盟</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] text-text-muted mb-1 block">特殊条款需求</label>
                    <div className="flex flex-wrap gap-2">
                      {['保密条款', '竞业禁止', '知识产权', '争议解决', '终止条款'].map((tag) => (
                        <button
                          key={tag}
                          className="px-3 py-1.5 rounded-md text-[12px] bg-bg-elevated text-text-secondary border border-white/[0.08] hover:border-coral/30 hover:text-text-primary transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {isGenerating ? (
                    <div className="space-y-3">
                      {/* Progress bar */}
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-coral to-[hsl(38,80%,45%)] rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${((genStep + 1) / genSteps.length) * 100}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                        <span className="text-[13px] text-text-secondary">
                          {genSteps[genStep]}...
                        </span>
                      </div>
                      <div className="flex justify-between px-2">
                        {genSteps.map((step, i) => (
                          <div key={step} className="flex flex-col items-center gap-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${
                              i <= genStep ? 'bg-coral text-bg-dark' : 'bg-white/10 text-text-muted'
                            }`}>
                              {i < genStep ? <CheckCircle size={10} /> : i + 1}
                            </div>
                            <span className={`text-[8px] ${i <= genStep ? 'text-coral' : 'text-text-muted'}`}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <GradientButton onClick={handleGenerate}>
                      <Sparkles size={16} />
                      AI生成合同
                    </GradientButton>
                  )}
                </div>
              </Card>
            </>
          ) : (
            /* Generated Result */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card variant="default" padding="none" className="overflow-hidden">
                {/* Doc Tabs */}
                <div className="flex border-b border-white/[0.06]">
                  {CONTRACT_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setContractTab(tab.key)}
                      className={`flex-1 py-2.5 text-[12px] font-medium transition-all relative ${
                        contractTab === tab.key ? 'text-coral' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {tab.label}
                      {contractTab === tab.key && (
                        <motion.div
                          layoutId="contract-doc-tab"
                          className="absolute bottom-0 left-2 right-2 h-[2px] bg-coral rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Preview Area */}
                <div className="p-4">
                  <div className="bg-bg-elevated rounded-md p-4 max-h-[320px] overflow-y-auto">
                    <pre className="text-[12px] text-text-secondary leading-[1.8] whitespace-pre-wrap font-mono">
                      {generatedText[contractTab as keyof typeof generatedText]}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 mt-4">
                    <button className="flex-1 h-11 rounded-md bg-bg-elevated border border-white/[0.08] text-text-primary text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                      <Download size={15} className="text-coral" />
                      下载PDF
                    </button>
                    <button className="flex-1 h-11 rounded-md bg-coral/15 border border-coral/30 text-coral text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-coral/20 transition-colors">
                      <FileText size={15} />
                      编辑
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="flex-1 h-11 rounded-md bg-bg-elevated border border-white/[0.08] text-text-primary text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                    >
                      <Sparkles size={15} className="text-teal" />
                      重新生成
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 3: Sanctions Screening
// ══════════════════════════════════════════════════════
function SanctionsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [screenStatus, setScreenStatus] = useState<ScreenStatus>('idle');
  const [screenType, setScreenType] = useState('all');
  const [isScreening, setIsScreening] = useState(false);

  const handleScreen = () => {
    if (!searchQuery.trim()) return;
    setIsScreening(true);
    setScreenStatus('idle');
    setTimeout(() => {
      setIsScreening(false);
      const rand = Math.random();
      if (rand > 0.7) setScreenStatus('warning');
      else if (rand > 0.9) setScreenStatus('highrisk');
      else setScreenStatus('clear');
    }, 1500);
  };

  const screenOptions = [
    { value: 'all', label: '全部' },
    { value: 'person', label: '个人' },
    { value: 'company', label: '公司' },
    { value: 'vessel', label: '船只' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Screening Input */}
      <Card variant="default" padding="lg">
        <h3 className="text-body font-medium text-text-primary mb-1 flex items-center gap-2">
          <ShieldAlert size={16} className="text-coral" />
          实时制裁筛查
        </h3>
        <p className="text-caption text-text-secondary mb-4">
          输入姓名或企业名称，实时查询全球制裁名单
        </p>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScreen()}
            className="w-full h-[52px] pl-10 pr-4 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
            placeholder="输入待筛查的个人或企业名称"
          />
        </div>

        {/* Type Options */}
        <div className="flex gap-2 mb-4">
          {screenOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setScreenType(opt.value)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                screenType === opt.value
                  ? 'bg-coral text-bg-dark'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <GradientButton onClick={handleScreen} isLoading={isScreening} disabled={!searchQuery.trim()}>
          <ShieldCheck size={16} />
          开始筛查
        </GradientButton>
      </Card>

      {/* Screening Results */}
      <AnimatePresence>
        {screenStatus !== 'idle' && !isScreening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <Card
              variant={screenStatus === 'clear' ? 'default' : screenStatus === 'warning' ? 'default' : 'default'}
              padding="lg"
              className={
                screenStatus === 'clear'
                  ? 'border border-teal/30'
                  : screenStatus === 'warning'
                  ? 'border border-yellow-500/30'
                  : 'border border-red-500/30'
              }
            >
              <div className="flex flex-col items-center text-center py-4">
                {screenStatus === 'clear' && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                    >
                      <CheckCircle size={48} className="text-teal mb-3" />
                    </motion.div>
                    <h3 className="text-h3 text-teal mb-1">筛查通过</h3>
                    <p className="text-body-sm text-text-secondary mb-4">
                      未在以下名单中匹配到记录
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center">
                      {['OFAC', 'UN', 'EU', 'HMT'].map((list) => (
                        <span key={list} className="flex items-center gap-1 text-[12px] text-teal">
                          <CheckCircle size={12} /> {list}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {screenStatus === 'warning' && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="animate-[shake_0.3s_ease-in-out]"
                    >
                      <AlertTriangle size={48} className="text-yellow-500 mb-3" />
                    </motion.div>
                    <h3 className="text-h3 text-yellow-500 mb-1">名称相似度85%</h3>
                    <p className="text-body-sm text-text-secondary mb-4">
                      发现相似记录，请人工复核
                    </p>
                    <div className="w-full bg-bg-elevated rounded-md p-3 text-left">
                      <p className="text-[12px] text-text-muted">匹配结果</p>
                      <p className="text-[13px] text-text-primary mt-1">
                        ABC International Trading Ltd
                      </p>
                      <p className="text-[11px] text-yellow-500 mt-1">相似度: 85% · 来源: OFAC</p>
                    </div>
                  </>
                )}
                {screenStatus === 'highrisk' && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                    >
                      <XCircle size={48} className="text-red-500 mb-3" />
                    </motion.div>
                    <h3 className="text-h3 text-red-500 mb-1">发现匹配记录</h3>
                    <p className="text-body-sm text-text-secondary mb-4">
                      匹配到OFAC制裁名单
                    </p>
                    <div className="w-full bg-red-500/5 border border-red-500/20 rounded-md p-3 text-left">
                      <p className="text-[12px] text-text-muted">匹配详情</p>
                      <p className="text-[13px] text-red-400 font-medium mt-1">
                        XYZ Shipping Co. (别名: XYZ Maritime)
                      </p>
                      <p className="text-[11px] text-text-muted mt-1">SDN名单 · 新增日期: 2025-11-15</p>
                      <p className="text-[11px] text-red-400 mt-2">
                        建议: 立即停止与该实体的任何交易，联系法务团队
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database Coverage */}
      <Card variant="default" padding="md">
        <h3 className="text-body font-medium text-text-primary mb-3">数据库覆盖</h3>
        <div className="space-y-2.5">
          {DB_COVERAGE.map((db, i) => (
            <motion.div
              key={db.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: db.color }} />
                <span className="text-[13px] text-text-primary">{db.name}</span>
              </div>
              <span className="text-[13px] font-medium" style={{ color: db.color }}>{db.count}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-text-muted">最后更新</span>
          <span className="text-[11px] text-text-secondary">2026-06-05</span>
        </div>
      </Card>

      {/* Batch Upload */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button className="w-full h-12 rounded-md bg-bg-card border border-dashed border-white/[0.15] text-text-secondary text-[13px] font-medium flex items-center justify-center gap-2 hover:border-coral/30 hover:text-text-primary transition-colors">
          <Upload size={16} className="text-coral" />
          上传CSV批量筛查
        </button>
      </motion.div>

      {/* Screening History */}
      <div>
        <h3 className="text-body font-medium text-text-primary mb-3">筛查历史</h3>
        <div className="space-y-2">
          {SCREENING_HISTORY.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center justify-between p-3 bg-bg-card border border-white/[0.06] rounded-md"
            >
              <span className="text-[13px] text-text-primary">{item.name}</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.result === 'clear'
                      ? 'bg-teal'
                      : item.result === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-[11px] text-text-muted">{item.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
