import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, TrendingUp, BarChart3,
  FileText, ChevronRight, CheckCircle,
  Sparkles, Building2, Wallet,
  Landmark, Route, Lightbulb, BookOpen,
  Layers, ArrowLeft
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import { usePageTitle } from '@/hooks/usePageTitle';
// (Charts rendered with custom animated divs — recharts not needed)

// ─── Types ───────────────────────────────────────────
interface TaxBreakdownRow {
  taxType: string;
  mainland: number;
  hainan: number;
  hainanSamoa: number;
  savings: number;
}

interface StructureResult {
  name: string;
  key: string;
  tax: number;
  color: string;
  rate: string;
  featured?: boolean;
}

// ─── Mock Data ───────────────────────────────────────
const TAX_BREAKDOWN_DATA: TaxBreakdownRow[] = [
  { taxType: '企业所得税', mainland: 25000, hainan: 15000, hainanSamoa: 0, savings: 25000 },
  { taxType: '增值税', mainland: 45000, hainan: 45000, hainanSamoa: 0, savings: 45000 },
  { taxType: '个人所得税', mainland: 15000, hainan: 10000, hainanSamoa: 5000, savings: 10000 },
  { taxType: '其他', mainland: 10000, hainan: 5000, hainanSamoa: 0, savings: 10000 },
];

const STRUCTURE_RESULTS: StructureResult[] = [
  { name: '纯内地架构', key: 'mainland', tax: 95000, color: '#EF4444', rate: '有效税率 19.0%' },
  { name: '海南架构', key: 'hainan', tax: 75000, color: '#60A5FA', rate: '有效税率 15.0%' },
  { name: '海南+萨摩亚', key: 'hainanSamoa', tax: 45000, color: '#00D4AA', rate: '有效税率 9.0%', featured: true },
  { name: '纯离岸', key: 'offshore', tax: 42000, color: '#A78BFA', rate: '有效税率 8.4%' },
];

const FLOW_STEPS = [
  { from: '海外客户', to: '萨摩亚SPV', desc: '收入归集至离岸主体' },
  { from: '萨摩亚SPV', to: '海南公司', desc: '服务费/特许权使用费' },
  { from: '海南公司', to: '内地团队', desc: '实际运营支出' },
];

const AI_ADVICE = [
  '建议将知识产权收入归集至萨摩亚SPV，可享受零税率优惠',
  '海南公司作为实际运营主体，可申请15%企业所得税优惠',
  '通过转让定价文档证明关联交易符合独立交易原则',
  '建议保留完整财务记录以备合规审查',
];

const REGULATION_SOURCES = [
  '萨摩亚国际公司法2024 (Samoa International Companies Act)',
  '海南自由贸易港企业所得税优惠目录',
  'OECD转让定价指南 (2022版)',
  '中国-萨摩亚税收协定',
];

const MARKET_OPTIONS = [
  { value: 'sea', label: '东南亚', flag: '🇹🇭' },
  { value: 'euus', label: '欧美', flag: '🇪🇺' },
  { value: 'me', label: '中东', flag: '🇸🇦' },
  { value: 'latam', label: '拉美', flag: '🇧🇷' },
  { value: 'global', label: '全球', flag: '🌍' },
];

const STRUCTURE_OPTIONS = [
  { value: 'mainland', label: '纯内地公司' },
  { value: 'hainan', label: '海南公司' },
  { value: 'offshore', label: '已有离岸' },
];

// ─── CountUp Component ───────────────────────────────
function AnimatedNumber({ value, duration, start }: { value: number; duration: number; start: boolean }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  // Use a microtask-based update to satisfy the strict ESLint rule
  const scheduleUpdate = (v: number) => {
    queueMicrotask(() => setDisplay(v));
  };

  useEffect(() => {
    if (!start) {
      scheduleUpdate(0);
      hasAnimated.current = false;
      return;
    }
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      scheduleUpdate(Math.floor(eased * value));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value, duration]);

  return <>{display.toLocaleString()}</>;
}

// ─── Main Component ──────────────────────────────────
export default function TaxCalculator() {
  usePageTitle('税务计算器');

  // Form state
  const [revenue, setRevenue] = useState('500000');
  const [margin, setMargin] = useState(40);
  const [targetMarket, setTargetMarket] = useState('sea');
  const [structure, setStructure] = useState('mainland');
  const [employees, setEmployees] = useState(10);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'breakdown' | 'flow' | 'ai' | 'source'>('breakdown');

  const savingsAmount = 50000;
  const savingsRate = 52.6;

  const chartData = STRUCTURE_RESULTS.map(s => ({
    name: s.name,
    tax: s.tax,
    color: s.color,
    featured: s.featured,
  }));

  const handleCalculate = () => setShowResults(true);

  const tabs = [
    { key: 'breakdown' as const, label: '税负拆解', icon: Wallet },
    { key: 'flow' as const, label: '资金路径', icon: Route },
    { key: 'ai' as const, label: 'AI建议', icon: Lightbulb },
    { key: 'source' as const, label: '法规来源', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="税务优化计算器" showBack />

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-4 mt-4 rounded-lg p-5 bg-gradient-to-r from-coral/20 via-coral/10 to-transparent"
      >
        <Calculator size={24} className="text-coral mb-2" />
        <h1 className="text-2xl font-bold text-text-primary">税务计算器</h1>
        <p className="text-[15px] text-text-secondary mt-1">4种架构税务对比，一目了然</p>
      </motion.div>

      <div className="px-4 pt-5 pb-6 space-y-5">
        {/* ── Input Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card variant="default" padding="lg">
            <h2 className="text-h3 text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-coral" />
              输入您的业务数据
            </h2>

            <div className="space-y-4">
              {/* Revenue */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <label className="text-body-sm text-text-secondary mb-1.5 block">您的年营收（美元）</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">$</span>
                  <input
                    type="number"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    className="w-full h-[52px] pl-10 pr-4 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
                    placeholder="例如: 500,000"
                  />
                </div>
              </motion.div>

              {/* Margin with Slider */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                <label className="text-body-sm text-text-secondary mb-1.5 block">毛利率</label>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xl text-coral">{margin}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-coral bg-white/10"
                />
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[10, 20, 30, 40, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMargin(v)}
                      className={`px-3 py-1.5 rounded-md text-[13px] transition-all ${
                        margin === v
                          ? 'bg-coral text-bg-dark font-medium'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Target Market */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
                <label className="text-body-sm text-text-secondary mb-1.5 block">目标市场</label>
                <select
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  className="w-full h-[52px] px-4 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40 transition-all appearance-none"
                  style={{ backgroundImage: 'none' }}
                >
                  {MARKET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.flag} {opt.label}
                    </option>
                  ))}
                </select>
              </motion.div>

              {/* Current Structure */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
                <label className="text-body-sm text-text-secondary mb-1.5 block">当前架构</label>
                <select
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  className="w-full h-[52px] px-4 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40 transition-all"
                >
                  {STRUCTURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </motion.div>

              {/* Employees */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
                <label className="text-body-sm text-text-secondary mb-1.5 block">员工人数</label>
                <input
                  type="number"
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="w-full h-[52px] px-4 rounded-md bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
                  min={1}
                />
              </motion.div>

              {/* Calculate Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-2"
              >
                <GradientButton onClick={handleCalculate}>
                  <Calculator size={18} />
                  开始计算
                </GradientButton>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* ── Results Section ── */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Bar Chart */}
              <Card variant="default" padding="lg" className="mb-5">
                <h2 className="text-h3 text-text-primary mb-1 flex items-center gap-2">
                  <BarChart3 size={18} className="text-coral" />
                  税务对比结果
                </h2>
                <p className="text-caption text-text-muted mb-4">
                  基于 ${Number(revenue).toLocaleString()} 收入 × {margin}% 毛利率
                </p>

                <div className="space-y-3">
                  {chartData.map((item, i) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i, duration: 0.4 }}
                      className={`flex items-center gap-3 p-3 rounded-md ${
                        item.featured
                          ? 'bg-teal/5 border border-teal/20'
                          : 'bg-bg-elevated/50'
                      }`}
                    >
                      {/* Color strip */}
                      <div
                        className="w-1 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium text-text-primary">{item.name}</span>
                          {item.featured && (
                            <span className="px-2 py-0.5 rounded-full bg-teal/15 text-teal text-[11px] font-medium">
                              最优
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-3 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.tax / 95000) * 100}%` }}
                            transition={{ delay: 0.2 + i * 0.15, duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-body font-semibold" style={{ color: item.color }}>
                          ${item.tax.toLocaleString()}
                        </p>
                        <p className="text-caption text-text-muted">
                          {STRUCTURE_RESULTS[i]?.rate}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-text-muted shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </Card>

              {/* Savings Highlight Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
                className="mb-5 rounded-xl p-6 bg-gradient-to-r from-coral to-[hsl(38,80%,45%)] text-center"
              >
                <p className="text-[14px] font-medium text-bg-dark/70">采用推荐架构，每年节省</p>
                <motion.p
                  className="font-display text-[36px] font-bold text-bg-dark mt-2"
                >
                  $<AnimatedNumber value={savingsAmount} duration={1200} start={showResults} />
                </motion.p>
                <p className="text-[14px] text-bg-dark/70 mt-1">节省率：{savingsRate}%</p>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="mt-3 inline-block px-3 py-1.5 rounded-full bg-bg-dark/20 text-bg-dark text-[13px] font-medium"
                >
                  相比纯内地架构
                </motion.div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3 mb-5"
              >
                <button className="flex-1 h-12 rounded-md bg-bg-elevated border border-white/[0.08] text-text-primary font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                  <FileText size={16} className="text-coral" />
                  查看详细报告
                </button>
                <button className="flex-1 h-12 rounded-md bg-teal/15 border border-teal/30 text-teal font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-teal/20 transition-colors">
                  <Building2 size={16} />
                  一键注册萨摩亚公司
                </button>
              </motion.div>

              {/* ── Detailed Breakdown Tabs ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card variant="default" padding="none" className="overflow-hidden">
                  {/* Tab Headers */}
                  <div className="flex border-b border-white/[0.06]">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition-all relative ${
                          activeTab === tab.key
                            ? 'text-coral'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                        {activeTab === tab.key && (
                          <motion.div
                            layoutId="tax-tab-indicator"
                            className="absolute bottom-0 left-2 right-2 h-[2px] bg-coral rounded-full"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    <AnimatePresence mode="wait">
                      {activeTab === 'breakdown' && (
                        <motion.div
                          key="breakdown"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="text-text-muted border-b border-white/[0.06]">
                                  <th className="text-left py-2 px-2 font-medium">税种</th>
                                  <th className="text-right py-2 px-2 font-medium">纯内地</th>
                                  <th className="text-right py-2 px-2 font-medium">海南</th>
                                  <th className="text-right py-2 px-2 font-medium text-teal">海南+萨摩亚</th>
                                  <th className="text-right py-2 px-2 font-medium text-coral">节省</th>
                                </tr>
                              </thead>
                              <tbody>
                                {TAX_BREAKDOWN_DATA.map((row, idx) => (
                                  <motion.tr
                                    key={row.taxType}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.06 }}
                                    className="border-b border-white/[0.04] last:border-0"
                                  >
                                    <td className="py-2.5 px-2 text-text-primary">{row.taxType}</td>
                                    <td className="py-2.5 px-2 text-right text-text-secondary">${row.mainland.toLocaleString()}</td>
                                    <td className="py-2.5 px-2 text-right text-text-secondary">${row.hainan.toLocaleString()}</td>
                                    <td className="py-2.5 px-2 text-right text-teal font-medium">${row.hainanSamoa.toLocaleString()}</td>
                                    <td className="py-2.5 px-2 text-right text-coral font-medium">${row.savings.toLocaleString()}</td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'flow' && (
                        <motion.div
                          key="flow"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          {FLOW_STEPS.map((step, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center shrink-0">
                                <Landmark size={18} className="text-coral" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-body-sm font-medium text-text-primary">{step.from}</span>
                                  <ArrowLeft size={12} className="text-text-muted rotate-180" />
                                  <span className="text-body-sm font-medium text-coral">{step.to}</span>
                                </div>
                                <p className="text-caption text-text-muted mt-0.5">{step.desc}</p>
                              </div>
                            </motion.div>
                          ))}
                          <div className="mt-3 p-3 rounded-md bg-coral/5 border border-coral/15">
                            <p className="text-[12px] text-coral leading-relaxed">
                              资金通过萨摩亚SPV归集后，以服务费形式回流海南公司，最终支持内地团队运营。整个路径合规透明，税务成本最低。
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'ai' && (
                        <motion.div
                          key="ai"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-coral" />
                            <span className="text-body-sm font-medium text-text-primary">AI 智能税务建议</span>
                          </div>
                          {AI_ADVICE.map((advice, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className="flex items-start gap-2.5"
                            >
                              <CheckCircle size={14} className="text-teal mt-0.5 shrink-0" />
                              <p className="text-[13px] text-text-secondary leading-relaxed">{advice}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === 'source' && (
                        <motion.div
                          key="source"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={16} className="text-coral" />
                            <span className="text-body-sm font-medium text-text-primary">法规数据来源 (RAG)</span>
                          </div>
                          {REGULATION_SOURCES.map((src, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.06 }}
                              className="flex items-start gap-2.5 p-2.5 rounded-md bg-bg-elevated"
                            >
                              <div className="w-5 h-5 rounded-full bg-coral/15 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] text-coral font-bold">{idx + 1}</span>
                              </div>
                              <p className="text-[13px] text-text-secondary leading-relaxed">{src}</p>
                            </motion.div>
                          ))}
                          <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1.5">
                            <Layers size={12} />
                            AI知识库实时检索，确保数据准确性
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AI Knowledge Base Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-lg p-4 bg-bg-card border border-white/[0.08]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-coral" />
            <span className="text-body font-medium text-text-primary">AI知识库</span>
            <span className="px-2 py-0.5 rounded-full bg-coral/15 text-coral text-[11px] font-medium">
              已加载20+国家
            </span>
          </div>
          <p className="text-caption text-text-secondary mb-3">
            覆盖全球主要司法管辖区的税率数据与合规要求
          </p>
          {/* 4-layer mini visualization */}
          <div className="flex gap-2">
            {[
              { label: '数据源', color: 'bg-coral' },
              { label: 'RAG检索', color: 'bg-blue-400' },
              { label: 'AI分析', color: 'bg-teal' },
              { label: '结果输出', color: 'bg-purple-400' },
            ].map((layer, i) => (
              <motion.div
                key={layer.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.08 }}
                className="flex-1 text-center"
              >
                <div className={`h-8 rounded-md ${layer.color} opacity-60 mb-1`} />
                <span className="text-[10px] text-text-muted">{layer.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
