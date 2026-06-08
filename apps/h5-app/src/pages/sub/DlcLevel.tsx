import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Star, Lock, CheckCircle, Clock, Zap, ChevronRight,
  TrendingUp, Users, PenTool, MessageSquare, ShieldCheck,
  Truck, BarChart3, Megaphone, Shield, Crown, Gem, ArrowRight
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';
import { formatNumber } from '@/lib/utils';

/* ─── DLC Level Config (L1-L9) ─── */
const DLC_LEVELS_FULL = [
  { level: 1, name: '见习', color: '#8B7355', minDvc: 0, maxDvc: 499, weight: 1.0, agents: 1 },
  { level: 2, name: '助理', color: '#CD7F32', minDvc: 500, maxDvc: 1999, weight: 1.2, agents: 2 },
  { level: 3, name: '专员', color: '#C0C0C0', minDvc: 2000, maxDvc: 4999, weight: 1.5, agents: 3 },
  { level: 4, name: '主管', color: '#FFD700', minDvc: 5000, maxDvc: 9999, weight: 1.8, agents: 4 },
  { level: 5, name: '经理', color: '#00D4AA', minDvc: 10000, maxDvc: 19999, weight: 2.0, agents: 5 },
  { level: 6, name: '大师', color: '#F6A623', minDvc: 20000, maxDvc: 49999, weight: 2.5, agents: 6 },
  { level: 7, name: '领袖', color: '#A78BFA', minDvc: 50000, maxDvc: 99999, weight: 3.0, agents: 8 },
  { level: 8, name: '宗师', color: '#EC4899', minDvc: 100000, maxDvc: 499999, weight: 4.0, agents: 9 },
  { level: 9, name: '传奇', color: '#CE1126', minDvc: 500000, maxDvc: 999999999, weight: 5.0, agents: 10 },
];

/* ─── Privilege data ─── */
interface Privilege {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  requiredLevel: number;
}

const PRIVILEGES: Privilege[] = [
  { id: 'p1', name: 'AI选品官', description: '智能选品分析，跨境热销趋势预测', icon: Gem, requiredLevel: 1 },
  { id: 'p2', name: 'AI定价师', description: '全球竞品定价分析与自动调价策略', icon: BarChart3, requiredLevel: 1 },
  { id: 'p3', name: 'AI文案师', description: '多语言产品文案与SEO优化', icon: PenTool, requiredLevel: 1 },
  { id: 'p4', name: 'AI客服官', description: '7×24小时多语言智能客服', icon: MessageSquare, requiredLevel: 2 },
  { id: 'p5', name: 'AI合规官', description: '全球法规自动审查与合规预警', icon: ShieldCheck, requiredLevel: 3 },
  { id: 'p6', name: 'AI物流官', description: '全球物流追踪与最优路径规划', icon: Truck, requiredLevel: 4 },
  { id: 'p7', name: 'AI汇率官', description: '实时汇率监控与智能换汇时机提醒', icon: TrendingUp, requiredLevel: 7 },
  { id: 'p8', name: 'AI广告官', description: '全球广告智能投放与ROI优化', icon: Megaphone, requiredLevel: 7 },
  { id: 'p9', name: 'AI风控官高级版', description: '企业级风控模型与欺诈实时拦截', icon: Shield, requiredLevel: 8 },
];

/* ─── Upgrade Tasks ─── */
const UPGRADE_TASKS = [
  { id: 't1', title: '完成3笔跨境交易', reward: 500, completed: 1, total: 3, icon: Zap },
  { id: 't2', title: '邀请1位好友注册', reward: 200, completed: 0, total: 1, icon: Users },
  { id: 't3', title: '发布1条自媒体内容', reward: 100, completed: 0, total: 1, icon: PenTool },
];

/* ─── User's current DLC data ─── */
const CURRENT_LEVEL = 6;
const CURRENT_DVC = 12580;
const CURRENT_LEVEL_DATA = DLC_LEVELS_FULL.find(l => l.level === CURRENT_LEVEL)!;
const NEXT_LEVEL_DATA = DLC_LEVELS_FULL.find(l => l.level === CURRENT_LEVEL + 1)!;
const PROGRESS = ((CURRENT_DVC - CURRENT_LEVEL_DATA.minDvc) / (CURRENT_LEVEL_DATA.maxDvc - CURRENT_LEVEL_DATA.minDvc)) * 100;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DlcLevel() {
  usePageTitle('DLC等级');
  const [activeTab, setActiveTab] = useState<'privileges' | 'levels'>('privileges');

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="DLC等级权益" showBack />

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ═══════════ LEVEL HERO ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl p-6 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${CURRENT_LEVEL_DATA.color}18 0%, rgba(246,166,35,0.08) 50%, transparent 100%)`,
            border: `1px solid ${CURRENT_LEVEL_DATA.color}30`,
          }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${CURRENT_LEVEL_DATA.color}30 0%, transparent 70%)` }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="relative text-center">
            {/* L6 Badge */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${CURRENT_LEVEL_DATA.color}40, ${CURRENT_LEVEL_DATA.color}15)`,
                border: `3px solid ${CURRENT_LEVEL_DATA.color}`,
                boxShadow: `0 0 30px ${CURRENT_LEVEL_DATA.color}40`,
              }}
            >
              <div>
                <p className="text-[28px] font-display font-bold" style={{ color: CURRENT_LEVEL_DATA.color }}>L6</p>
                <p className="text-[10px] font-medium" style={{ color: CURRENT_LEVEL_DATA.color }}>{CURRENT_LEVEL_DATA.name}</p>
              </div>
              {/* Pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${CURRENT_LEVEL_DATA.color}` }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-h2 text-text-primary font-semibold"
            >
              {CURRENT_LEVEL_DATA.name}大师
            </motion.h2>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-body-sm text-text-secondary mt-1"
            >
              {formatNumber(CURRENT_DVC)} / {formatNumber(CURRENT_LEVEL_DATA.maxDvc)} DVC
            </motion.p>

            {/* Progress Bar */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-caption text-text-muted">距L7{CURRENT_LEVEL_DATA.name}还差 {formatNumber(NEXT_LEVEL_DATA.minDvc - CURRENT_DVC)} DVC</span>
                <span className="text-caption font-medium" style={{ color: CURRENT_LEVEL_DATA.color }}>{Math.min(PROGRESS, 100).toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-bg-elevated rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${CURRENT_LEVEL_DATA.color}, #F6A623)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(PROGRESS, 100)}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>

            {/* DVSF Weight */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ backgroundColor: `${CURRENT_LEVEL_DATA.color}20` }}
            >
              <Zap size={14} style={{ color: CURRENT_LEVEL_DATA.color }} />
              <span className="text-caption font-medium" style={{ color: CURRENT_LEVEL_DATA.color }}>
                DVSF分红权重: {CURRENT_LEVEL_DATA.weight}x
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* ═══════════ UPGRADE TASKS ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-teal" />
            <h2 className="text-body font-semibold text-text-primary">完成以下任务加速升级</h2>
          </div>

          <div className="space-y-2.5">
            {UPGRADE_TASKS.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card variant="interactive" padding="md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal/15 flex items-center justify-center shrink-0">
                      <task.icon size={18} className="text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-text-primary">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full"
                            style={{ width: `${(task.completed / task.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0">{task.completed}/{task.total}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-caption text-coral font-medium">+{task.reward}</span>
                      <p className="text-[9px] text-text-muted">DVC</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══════════ TABS ═══════════ */}
        <div className="flex gap-2">
          {([
            { key: 'privileges' as const, label: '特权列表' },
            { key: 'levels' as const, label: '等级对照' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-10 rounded-lg text-body-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-accent text-bg-dark'
                  : 'bg-bg-elevated text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════ PRIVILEGE LIST ═══════════ */}
        {activeTab === 'privileges' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2.5"
          >
            {PRIVILEGES.map((priv) => {
              const isUnlocked = CURRENT_LEVEL >= priv.requiredLevel;
              const isNear = priv.requiredLevel <= CURRENT_LEVEL + 1 && !isUnlocked;
              return (
                <motion.div key={priv.id} variants={itemVariants}>
                  <Card variant={isUnlocked ? 'default' : 'elevated'} padding="md">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isUnlocked ? '' : 'opacity-50'
                        }`}
                        style={{
                          backgroundColor: isUnlocked
                            ? `${CURRENT_LEVEL_DATA.color}20`
                            : 'rgba(107,114,128,0.1)',
                        }}
                      >
                        <span style={{ color: isUnlocked ? CURRENT_LEVEL_DATA.color : '#6B7280' }}>
                          <priv.icon size={18} strokeWidth={1.5} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-body-sm ${isUnlocked ? 'text-text-primary' : 'text-text-muted'}`}>
                            {priv.name}
                          </span>
                          {isUnlocked ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal/15 text-teal font-medium">
                              已解锁
                            </span>
                          ) : isNear ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                              L{priv.requiredLevel}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-muted">
                              <Lock size={9} className="inline mr-0.5" />
                              L{priv.requiredLevel}
                            </span>
                          )}
                        </div>
                        <p className={`text-caption ${isUnlocked ? 'text-text-secondary' : 'text-text-muted'}`}>
                          {priv.description}
                        </p>
                      </div>
                      {isUnlocked && <CheckCircle size={18} className="text-teal shrink-0" />}
                      {!isUnlocked && <Lock size={16} className="text-text-muted shrink-0" />}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ═══════════ LEVEL COMPARISON TABLE ═══════════ */}
        {activeTab === 'levels' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-bg-card border border-white/[0.08] rounded-xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">等级</th>
                    <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">升级条件</th>
                    <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">DVSF权重</th>
                    <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">Agent数</th>
                  </tr>
                </thead>
                <tbody>
                  {DLC_LEVELS_FULL.map((lvl) => {
                    const isCurrent = lvl.level === CURRENT_LEVEL;
                    return (
                      <motion.tr
                        key={lvl.level}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: lvl.level * 0.04 }}
                        className={`border-b border-white/[0.04] ${isCurrent ? 'bg-accent/5' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                              style={{ backgroundColor: `${lvl.color}25`, color: lvl.color }}
                            >
                              {lvl.level}
                            </div>
                            <span className={`text-body-sm ${isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                              {lvl.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[8px] px-1 py-0.5 rounded bg-accent/20 text-accent font-medium">当前</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-caption text-text-muted">
                          {formatNumber(lvl.minDvc)} DVC
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-caption font-medium" style={{ color: lvl.color }}>{lvl.weight}x</span>
                        </td>
                        <td className="px-3 py-2.5 text-caption text-text-muted">
                          {lvl.agents}个
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
