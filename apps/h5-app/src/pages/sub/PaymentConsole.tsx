import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  TrendingUp,
  ArrowRight,
  Globe,
  Wallet,
  Zap,
  ChevronRight,
  Landmark,
  Search,
  ArrowDown,
  ArrowUpLeft,
  ToggleLeft,
  ToggleRight,
  Lock,
  DollarSign,
  RefreshCw,
  Filter,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import StatusBadge from '@/components/shared/StatusBadge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

/* ─── SPV Accounts ─── */
const SPV_ACCOUNTS = [
  {
    id: 'spv1',
    name: 'TAICHU OPC LTD',
    currency: 'USD',
    balance: 18420.5,
    available: 16500.0,
    frozen: 1920.5,
  },
  {
    id: 'spv2',
    name: 'TAICHU TRADING LTD',
    currency: 'USD',
    balance: 8930.25,
    available: 8930.25,
    frozen: 0,
  },
  {
    id: 'spv3',
    name: 'TAICHU HOLDINGS LTD',
    currency: 'EUR',
    balance: 5600.0,
    available: 5600.0,
    frozen: 0,
  },
];

/* ─── Payment Channels with toggles ─── */
interface ChannelData {
  id: string;
  name: string;
  type: string;
  currencies: string[];
  fee: number;
  isActive: boolean;
  icon: string;
}

const CHANNEL_DATA: ChannelData[] = [
  {
    id: 'pay_visa',
    name: 'Visa/Mastercard',
    type: 'card',
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 2.9,
    isActive: true,
    icon: 'CreditCard',
  },
  {
    id: 'pay_usdt',
    name: 'USDT (TRC20)',
    type: 'crypto',
    currencies: ['USDT'],
    fee: 0.5,
    isActive: true,
    icon: 'Coins',
  },
  {
    id: 'pay_grab',
    name: 'GrabPay',
    type: 'ewallet',
    currencies: ['SGD', 'MYR', 'THB'],
    fee: 1.8,
    isActive: true,
    icon: 'Wallet',
  },
  {
    id: 'pay_alipay',
    name: '支付宝',
    type: 'ewallet',
    currencies: ['CNY', 'HKD'],
    fee: 1.2,
    isActive: false,
    icon: 'Zap',
  },
  {
    id: 'pay_bank',
    name: '银行转账',
    type: 'bank',
    currencies: ['USD', 'EUR', 'GBP', 'SGD'],
    fee: 0,
    isActive: true,
    icon: 'Landmark',
  },
];

export default function PaymentConsole() {
  usePageTitle('全球收款控制台');
  const channels = useAppStore((s) => s.paymentChannels);
  const transactions = useAppStore((s) => s.paymentTransactions);
  const exchangeRates = useAppStore((s) => s.exchangeRates);

  const [selectedAccount, setSelectedAccount] = useState(SPV_ACCOUNTS[0]);
  const [channelList, setChannelList] = useState(CHANNEL_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawStep, setWithdrawStep] = useState(1);

  const toggleChannel = (id: string) => {
    setChannelList((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)));
  };

  const filteredTxns = transactions.filter(
    (t) =>
      t.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWithdraw = () => {
    setShowWithdraw(true);
    setWithdrawStep(1);
    setWithdrawAmount('');
    setWithdrawMethod('');
  };

  const totalBalance = SPV_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const totalAvailable = SPV_ACCOUNTS.reduce((s, a) => s + a.available, 0);
  const totalFrozen = SPV_ACCOUNTS.reduce((s, a) => s + a.frozen, 0);

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="全球收款控制台" showBack />

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ═══════════ ACCOUNT SELECTOR ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption text-text-muted uppercase tracking-wider">SPV账户</span>
            <button className="text-caption text-accent flex items-center gap-1">
              <RefreshCw size={12} />
              刷新
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SPV_ACCOUNTS.map((acc) => (
              <motion.button
                key={acc.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedAccount(acc)}
                className={`shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all ${
                  selectedAccount.id === acc.id
                    ? 'border-coral/40 bg-coral/10'
                    : 'border-white/[0.08] bg-bg-card'
                }`}
              >
                <p
                  className={`text-body-sm font-medium ${selectedAccount.id === acc.id ? 'text-coral' : 'text-text-primary'}`}
                >
                  {acc.name}
                </p>
                <p className="text-[10px] text-text-muted">{acc.currency}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ═══════════ BALANCE CARDS ═══════════ */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: '总资产', value: totalBalance, color: 'text-gradient-kpi', prefix: '$' },
            { label: '可用余额', value: totalAvailable, color: 'text-teal', prefix: '$' },
            { label: '冻结金额', value: totalFrozen, color: 'text-warning', prefix: '$' },
          ].map((card) => (
            <motion.div
              key={card.label}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="bg-bg-card border border-white/[0.08] rounded-xl p-3"
            >
              <p className="text-[10px] text-text-muted">{card.label}</p>
              <p className={`font-display text-h3 mt-1 ${card.color}`}>
                {card.prefix}
                {card.value.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ═══════════ REVENUE HERO ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(246,166,35,0.15) 0%, rgba(0,212,170,0.08) 50%, transparent 100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-coral" />
            <span className="text-caption text-text-muted">今日收入</span>
          </div>
          <p className="font-display text-[32px] text-gradient-kpi leading-tight">$2,480</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-caption text-teal">+23.5%</span>
            <span className="text-caption text-text-muted">较昨日</span>
          </div>
        </motion.div>

        {/* ═══════════ EXCHANGE RATES ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-body font-semibold text-text-primary flex items-center gap-2">
              <Globe size={16} className="text-teal" />
              实时汇率
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {exchangeRates.slice(0, 4).map((rate) => (
              <Card key={`${rate.from}-${rate.to}`} variant="default" padding="sm">
                <p className="text-[10px] text-text-muted">
                  {rate.from}/{rate.to}
                </p>
                <p className="font-display text-h3 text-text-primary mt-0.5">
                  {rate.rate.toFixed(4)}
                </p>
                <p
                  className={`text-[10px] mt-0.5 ${rate.change24h >= 0 ? 'text-teal' : 'text-danger'}`}
                >
                  {rate.change24h >= 0 ? '+' : ''}
                  {rate.change24h}%
                </p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ═══════════ QUICK ACTIONS ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          {[
            { label: '充值', icon: ArrowDown, color: 'text-teal', bg: 'bg-teal/15' },
            {
              label: '提现',
              icon: ArrowUpLeft,
              color: 'text-coral',
              bg: 'bg-coral/15',
              onClick: handleWithdraw,
            },
            { label: '转账', icon: RefreshCw, color: 'text-accent', bg: 'bg-accent/15' },
          ].map((action) => (
            <motion.button
              key={action.label}
              whileTap={{ scale: 0.93 }}
              onClick={action.onClick}
              className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl bg-bg-card border border-white/[0.08]"
            >
              <div
                className={`w-10 h-10 rounded-full ${action.bg} flex items-center justify-center`}
              >
                <action.icon size={18} className={action.color} />
              </div>
              <span className="text-caption text-text-secondary">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ═══════════ WITHDRAWAL FLOW ═══════════ */}
        <AnimatePresence>
          {showWithdraw && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card variant="featured" padding="lg" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-body font-semibold text-text-primary">提现</h3>
                  <button onClick={() => setShowWithdraw(false)} className="text-text-muted">
                    <span className="text-caption">取消</span>
                  </button>
                </div>

                {withdrawStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-caption text-text-muted mb-1 block">提现金额</label>
                      <div className="relative">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                        />
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-12 pl-9 pr-4 rounded-xl bg-bg-input border border-white/[0.1] text-text-primary font-display text-h3 focus:outline-none focus:border-coral/40"
                        />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1">
                        可用: ${selectedAccount.available.toLocaleString()}
                      </p>
                    </div>
                    <GradientButton
                      onClick={() => withdrawAmount && setWithdrawStep(2)}
                      disabled={
                        !withdrawAmount || parseFloat(withdrawAmount) > selectedAccount.available
                      }
                      className="w-full"
                    >
                      下一步
                    </GradientButton>
                  </motion.div>
                )}

                {withdrawStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <p className="text-caption text-text-muted">选择提现方式</p>
                    {['USDT (TRC20)', '银行电汇', 'Wise'].map((method) => (
                      <motion.button
                        key={method}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setWithdrawMethod(method)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
                          withdrawMethod === method
                            ? 'border-coral/40 bg-coral/10'
                            : 'border-white/[0.08] bg-bg-card'
                        }`}
                      >
                        <CreditCard size={18} className="text-coral" />
                        <span className="text-body-sm text-text-primary flex-1">{method}</span>
                        {withdrawMethod === method && (
                          <CheckCircle size={16} className="text-coral" />
                        )}
                      </motion.button>
                    ))}
                    <div className="flex gap-2">
                      <GradientButton
                        variant="ghost"
                        onClick={() => setWithdrawStep(1)}
                        className="flex-1"
                      >
                        返回
                      </GradientButton>
                      <GradientButton
                        onClick={() => withdrawMethod && setWithdrawStep(3)}
                        disabled={!withdrawMethod}
                        className="flex-1"
                      >
                        下一步
                      </GradientButton>
                    </div>
                  </motion.div>
                )}

                {withdrawStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="bg-bg-card rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-caption text-text-muted">提现金额</span>
                        <span className="text-body-sm text-text-primary">
                          ${parseFloat(withdrawAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-caption text-text-muted">提现方式</span>
                        <span className="text-body-sm text-text-primary">{withdrawMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-caption text-text-muted">手续费</span>
                        <span className="text-body-sm text-text-primary">$15.00</span>
                      </div>
                      <div className="border-t border-white/[0.06] pt-2 flex justify-between">
                        <span className="text-body-sm font-medium text-text-primary">到账金额</span>
                        <span className="font-display text-h3 text-gradient-kpi">
                          ${(parseFloat(withdrawAmount) - 15).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <GradientButton onClick={() => setShowWithdraw(false)} className="w-full">
                      确认提现
                    </GradientButton>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════ CHANNEL MANAGEMENT ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body font-semibold text-text-primary flex items-center gap-2">
              <CreditCard size={16} className="text-coral" />
              收款通道管理
            </h2>
            <span className="text-caption text-teal">
              {channelList.filter((c) => c.isActive).length} 个活跃
            </span>
          </div>
          <div className="space-y-2">
            {channelList.map((ch, i) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <Card variant="default" padding="md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                      <CreditCard size={18} className="text-coral" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-body-sm font-medium text-text-primary">{ch.name}</h3>
                      <p className="text-[10px] text-text-muted">
                        {ch.currencies.join(', ')} · 费率 {ch.fee}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ch.isActive ? 'success' : 'default'} size="sm">
                        {ch.isActive ? '已激活' : '已关闭'}
                      </StatusBadge>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleChannel(ch.id)}>
                        {ch.isActive ? (
                          <ToggleRight size={28} className="text-teal" />
                        ) : (
                          <ToggleLeft size={28} className="text-text-muted" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══════════ TRANSACTION HISTORY ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-teal" />
              交易记录
            </h2>
            <button className="text-caption text-text-muted flex items-center gap-1">
              <Filter size={12} /> 筛选
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索交易..."
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-bg-card border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coral/40"
            />
          </div>

          <div className="space-y-2">
            {filteredTxns.slice(0, 8).map((txn) => (
              <motion.div key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card variant="default" padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          txn.type === 'incoming' ? 'bg-teal/15' : 'bg-coral/15'
                        }`}
                      >
                        {txn.type === 'incoming' ? (
                          <ArrowDown size={14} className="text-teal" />
                        ) : (
                          <ArrowUpLeft size={14} className="text-coral" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm text-text-primary truncate">
                          {txn.counterparty}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {txn.channelName} · {txn.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p
                        className={`font-display text-body-sm ${txn.type === 'incoming' ? 'text-teal' : 'text-text-primary'}`}
                      >
                        {txn.type === 'incoming' ? '+' : '-'}
                        {formatCurrency(txn.amount, txn.currency)}
                      </p>
                      <StatusBadge
                        status={
                          txn.status === 'completed'
                            ? 'success'
                            : txn.status === 'pending'
                              ? 'warning'
                              : 'accent'
                        }
                        size="sm"
                      >
                        {txn.status === 'completed'
                          ? '完成'
                          : txn.status === 'pending'
                            ? '待处理'
                            : '处理中'}
                      </StatusBadge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
