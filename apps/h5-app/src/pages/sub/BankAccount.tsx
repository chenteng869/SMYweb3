import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark,
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
  Building2,
  ChevronRight,
  FileText,
  Star,
  ShieldCheck,
  Zap,
  Bot,
  Upload,
  Download,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import StatusBadge from '@/components/shared/StatusBadge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';

/* ─── Bank Partners with detailed data ─── */
const BANK_PARTNERS = [
  {
    name: '汇丰银行',
    currency: 'USD/HKD',
    countries: ['HK', 'SG', 'GB'],
    fee: 25,
    minDeposit: 10000,
    timeline: '2-3周',
    features: ['多币种账户', '网银', '信用卡'],
    icon: Landmark,
    color: '#F6A623',
  },
  {
    name: '星展银行',
    currency: 'SGD/USD',
    countries: ['SG', 'HK'],
    fee: 0,
    minDeposit: 5000,
    timeline: '1-2周',
    features: ['数字银行', 'API对接', '低费率'],
    icon: Landmark,
    color: '#CE1126',
  },
  {
    name: '华侨银行',
    currency: 'SGD/USD',
    countries: ['SG'],
    fee: 15,
    minDeposit: 3000,
    timeline: '1-2周',
    features: ['中文服务', '投资产品', '保险'],
    icon: Landmark,
    color: '#3B82F6',
  },
  {
    name: '渣打银行',
    currency: 'USD/GBP',
    countries: ['HK', 'SG', 'GB'],
    fee: 30,
    minDeposit: 20000,
    timeline: '2-4周',
    features: ['私人银行', '全球网络', '贵金属'],
    icon: Landmark,
    color: '#00D4AA',
  },
];

/* ─── Status Timeline ─── */
const STATUS_STEPS = [
  { label: '资料提交', done: true, date: '2024-12-01' },
  { label: 'AI审核', done: true, date: '2024-12-03' },
  { label: '银行审核', done: true, date: '2024-12-10' },
  { label: '视频面签', done: false, date: '待预约' },
  { label: '账户开通', done: false, date: '预计12/25' },
];

/* ─── Application Form State ─── */
const DOC_CHECKLIST = [
  { id: 'dc1', name: '公司注册证书', required: true, uploaded: true },
  { id: 'dc2', name: '董事身份证明', required: true, uploaded: true },
  { id: 'dc3', name: '地址证明', required: true, uploaded: true },
  { id: 'dc4', name: '商业计划书', required: true, uploaded: false },
  { id: 'dc5', name: '银行推荐信', required: false, uploaded: false },
  { id: 'dc6', name: '财务报表', required: false, uploaded: false },
];

/* ─── AI Recommendation ─── */
const AI_RECOMMENDATION = {
  bank: '星展银行',
  reason: '基于您的业务模式和所在地（新加坡），星展银行提供最优的数字化体验和最低的开户门槛。',
  matchScore: 96,
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function BankAccount() {
  usePageTitle('银行开户协同');
  const companies = useAppStore((s) => s.companies);

  const [showApply, setShowApply] = useState(false);
  const [applyStep, setApplyStep] = useState(1);
  const [selectedBank, setSelectedBank] = useState('');
  const [docs, setDocs] = useState(DOC_CHECKLIST);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const handleDocUpload = (id: string) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, uploaded: true } : d)));
  };

  const handleApplySubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setApplySuccess(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="银行开户协同" showBack />

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ═══════════ AI RECOMMENDATION CARD ═══════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="featured" padding="lg" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[120px] h-[120px] opacity-10">
              <Bot size={120} className="text-accent" />
            </div>
            <div className="flex items-start gap-3 relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-orange-500 flex items-center justify-center shrink-0">
                <Bot size={24} className="text-bg-dark" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-body font-semibold text-text-primary">AI智能推荐</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-coral/15 text-coral font-medium">
                    匹配度 {AI_RECOMMENDATION.matchScore}%
                  </span>
                </div>
                <p className="text-caption text-text-secondary leading-relaxed">
                  {AI_RECOMMENDATION.reason}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Landmark size={14} className="text-accent" />
                  <span className="text-body-sm font-medium text-accent">
                    {AI_RECOMMENDATION.bank}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ═══════════ HEADER INFO ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-4"
        >
          <div className="flex-1 bg-bg-card border border-white/[0.08] rounded-xl p-3 text-center">
            <Globe size={18} className="text-teal mx-auto mb-1" />
            <p className="font-display text-h3 text-text-primary">10+</p>
            <p className="text-[10px] text-text-muted">覆盖国家</p>
          </div>
          <div className="flex-1 bg-bg-card border border-white/[0.08] rounded-xl p-3 text-center">
            <Landmark size={18} className="text-coral mx-auto mb-1" />
            <p className="font-display text-h3 text-text-primary">20+</p>
            <p className="text-[10px] text-text-muted">合作银行</p>
          </div>
          <div className="flex-1 bg-bg-card border border-white/[0.08] rounded-xl p-3 text-center">
            <Zap size={18} className="text-accent mx-auto mb-1" />
            <p className="font-display text-h3 text-text-primary">7天</p>
            <p className="text-[10px] text-text-muted">最快开户</p>
          </div>
        </motion.div>

        {/* ═══════════ APPLY FORM (conditional) ═══════════ */}
        <AnimatePresence>
          {showApply && !applySuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card variant="featured" padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-body font-semibold text-text-primary">
                    开户申请 — 步骤 {applyStep}/3
                  </h3>
                  <button onClick={() => setShowApply(false)} className="text-text-muted">
                    <span className="text-caption">关闭</span>
                  </button>
                </div>

                {/* Step 1: Company & Director Info */}
                {applyStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-caption text-text-muted mb-1 block">申请公司</label>
                      <select className="w-full h-12 px-4 rounded-xl bg-bg-input border border-white/[0.1] text-text-primary text-body-sm focus:outline-none focus:border-coral/40">
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-caption text-text-muted mb-1 block">
                        主申请人姓名
                      </label>
                      <input
                        type="text"
                        placeholder="如：陈董"
                        className="w-full h-12 px-4 rounded-xl bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40"
                      />
                    </div>
                    <div>
                      <label className="text-caption text-text-muted mb-1 block">业务描述</label>
                      <textarea
                        placeholder="简要描述公司业务模式"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl bg-bg-input border border-white/[0.1] text-text-primary text-body-sm focus:outline-none focus:border-coral/40 resize-none"
                      />
                    </div>
                    <GradientButton onClick={() => setApplyStep(2)} className="w-full">
                      下一步
                    </GradientButton>
                  </motion.div>
                )}

                {/* Step 2: Document Checklist */}
                {applyStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    <p className="text-caption text-text-muted mb-2">请上传以下文件</p>
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-card border border-white/[0.06]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                          {doc.uploaded ? (
                            <CheckCircle size={16} className="text-teal" />
                          ) : (
                            <FileText size={16} className="text-text-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-body-sm ${doc.uploaded ? 'text-text-primary' : 'text-text-secondary'}`}
                          >
                            {doc.name}
                          </p>
                          {doc.required && <span className="text-[9px] text-danger">必需</span>}
                        </div>
                        {!doc.uploaded ? (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDocUpload(doc.id)}
                            className="px-2.5 py-1 rounded-md bg-coral/15 text-coral text-[10px] font-medium"
                          >
                            上传
                          </motion.button>
                        ) : (
                          <span className="text-[10px] text-teal">已上传</span>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <GradientButton
                        variant="ghost"
                        onClick={() => setApplyStep(1)}
                        className="flex-1"
                      >
                        返回
                      </GradientButton>
                      <GradientButton onClick={() => setApplyStep(3)} className="flex-1">
                        下一步
                      </GradientButton>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review */}
                {applyStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="bg-bg-card rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-caption text-text-muted">目标银行</span>
                        <span className="text-body-sm text-text-primary">
                          {selectedBank || AI_RECOMMENDATION.bank}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-caption text-text-muted">申请公司</span>
                        <span className="text-body-sm text-text-primary">{companies[0]?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-caption text-text-muted">预计开户费</span>
                        <span className="text-body-sm text-text-primary">$0-50</span>
                      </div>
                    </div>
                    <GradientButton
                      onClick={handleApplySubmit}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" /> 提交中...
                        </span>
                      ) : (
                        '提交申请'
                      )}
                    </GradientButton>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )}

          {applySuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-bg-card border border-teal/30 rounded-xl p-5 text-center"
            >
              <CheckCircle size={40} className="text-teal mx-auto mb-2" />
              <h3 className="text-body font-semibold text-text-primary">申请已提交</h3>
              <p className="text-caption text-text-secondary mt-1">银行将在3-5个工作日内完成初审</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════ PROGRESS TRACKER ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-body font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Clock size={16} className="text-teal" />
            开户进度
          </h2>
          <Card variant="default" padding="lg">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-white/[0.06]" />

              <div className="space-y-4">
                {STATUS_STEPS.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i }}
                    className="flex items-start gap-3 relative"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2',
                        step.done
                          ? 'bg-gradient-to-br from-teal to-emerald-500 border-teal text-bg-dark'
                          : 'bg-bg-elevated border-white/[0.1] text-text-muted'
                      )}
                    >
                      {step.done ? <CheckCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <p
                        className={cn(
                          'text-body-sm',
                          step.done ? 'text-text-primary font-medium' : 'text-text-muted'
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">{step.date}</p>
                    </div>
                    {i === 3 && !step.done && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-coral/15 text-coral text-[10px] font-medium"
                      >
                        预约
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ═══════════ MY BANK ACCOUNTS ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-body font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Landmark size={16} className="text-coral" />
            我的账户
          </h2>
          <div className="space-y-2">
            {companies
              .flatMap((c) => c.bankAccounts || [])
              .map((account, i) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card variant="interactive" padding="md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center">
                          <Landmark size={18} className="text-coral" />
                        </div>
                        <div>
                          <p className="text-body-sm font-medium text-text-primary">
                            {account.bankName}
                          </p>
                          <p className="text-caption text-text-muted">
                            {account.accountNumber} · {account.currency}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="success" size="sm">
                        正常
                      </StatusBadge>
                    </div>
                  </Card>
                </motion.div>
              ))}
          </div>
        </motion.section>

        {/* ═══════════ BANK COMPARISON ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-body font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Star size={16} className="text-accent" />
            银行对比
          </h2>
          <div className="bg-bg-card border border-white/[0.08] rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">银行</th>
                  <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">币种</th>
                  <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">开户费</th>
                  <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">最低存款</th>
                  <th className="px-3 py-2.5 text-[10px] text-text-muted font-medium">周期</th>
                </tr>
              </thead>
              <tbody>
                {BANK_PARTNERS.map((bank, i) => (
                  <motion.tr
                    key={bank.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.03 * i }}
                    className="border-b border-white/[0.04]"
                  >
                    <td className="px-3 py-2.5">
                      <span className="text-body-sm text-text-primary font-medium">
                        {bank.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-caption text-text-muted">{bank.currency}</td>
                    <td className="px-3 py-2.5 text-caption text-text-muted">${bank.fee}</td>
                    <td className="px-3 py-2.5 text-caption text-text-muted">
                      ${bank.minDeposit.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-caption text-teal">{bank.timeline}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* ═══════════ CTA ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GradientButton
            onClick={() => {
              setShowApply(true);
              setApplyStep(1);
            }}
            className="w-full"
          >
            <FileText size={18} />
            申请新账户
          </GradientButton>
        </motion.div>
      </div>
    </div>
  );
}
