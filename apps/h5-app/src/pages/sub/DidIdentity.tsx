import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  Fingerprint,
  Key,
  Link,
  EyeOff,
  Download,
  Copy,
  Share2,
  RefreshCw,
  CheckCircle,
  Clock,
  ChevronRight,
  Shield,
  Activity,
  Globe,
  Lock,
  FileCheck,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import StatusBadge from '@/components/shared/StatusBadge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';

// ============================
// Mock Data
// ============================
const DID_DATA = {
  did: 'did:fish:0x7a3b8c9d2e1f0a4b5c6d7e8f9a0b1c2d3e4f5a6b',
  shortDid: 'did:fish:0x7a3b...8f2c',
  blockchain: 'FISCO BCOS',
  encryption: '国密 SM2/SM3/SM4',
  createdDate: '2024-12-01',
  authStatus: '已认证' as const,
  lastVerified: '2025-01-15 14:32:08',
};

const VC_CREDENTIALS = [
  {
    id: 'vc-001',
    name: '企业注册凭证',
    issuer: '太初国链认证中心',
    issueDate: '2024-12-05',
    expiryDate: '2027-12-05',
    status: '已签发' as const,
    type: 'business_reg',
    icon: Building,
    color: '#00D4AA',
  },
  {
    id: 'vc-002',
    name: 'KYC认证凭证',
    issuer: '太初身份验证局',
    issueDate: '2024-12-10',
    expiryDate: '2025-12-10',
    status: '已签发' as const,
    type: 'kyc',
    icon: UserCheck,
    color: '#00D4AA',
  },
  {
    id: 'vc-003',
    name: '税务合规凭证',
    issuer: '萨摩亚税务局',
    issueDate: '2025-01-08',
    expiryDate: '2026-01-08',
    status: '审核中' as const,
    type: 'tax',
    icon: FileCheck,
    color: '#F6A623',
  },
];

const ACTIVITY_LOGS = [
  {
    id: 'act-001',
    time: '2025-01-15 14:32',
    action: '身份链上验证',
    target: 'FISCO BCOS 节点 #3',
    status: 'success' as const,
  },
  {
    id: 'act-002',
    time: '2025-01-14 09:15',
    action: 'KYC凭证核验',
    target: '太初身份验证局',
    status: 'success' as const,
  },
  {
    id: 'act-003',
    time: '2025-01-12 16:48',
    action: '税务凭证提交',
    target: '萨摩亚税务局',
    status: 'pending' as const,
  },
  {
    id: 'act-004',
    time: '2025-01-10 11:22',
    action: '企业凭证授权',
    target: '跨境电商平台',
    status: 'success' as const,
  },
  {
    id: 'act-005',
    time: '2025-01-08 08:05',
    action: 'DID密钥轮换',
    target: '本地安全模块',
    status: 'success' as const,
  },
];

// ============================
// Icon wrappers for credential types
// ============================
function Building({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size || 20}
      height={size || 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 22V10l6-4 6 4v12H6z" />
      <path d="M10 22v-6h4v6" />
      <path d="M2 22h20" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function UserCheck({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size || 20}
      height={size || 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

// ============================
// QR Code SVG Component
// ============================
function QRCodeSVG({ did }: { did: string }) {
  // Generate a deterministic pseudo-random pattern from DID string
  const cells: boolean[] = [];
  let hash = 0;
  for (let i = 0; i < did.length; i++) {
    hash = ((hash << 5) - hash + did.charCodeAt(i)) | 0;
  }
  const size = 25;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Position detection patterns (corners)
      const isCornerPattern =
        (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
      if (isCornerPattern) {
        // Outer square
        const inOuter =
          (r === 0 || r === 6 || c === 0 || c === 6) &&
          !(r === 0 && c === 0) &&
          !(r === 0 && c === 6) &&
          !(r === 6 && c === 0) &&
          !(r === 6 && c === 6);
        // Inner square
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells.push(inOuter || inInner);
      } else {
        const idx = r * size + c;
        const val = Math.abs(((hash * 9301 + 49297) % 233280) / 233280);
        cells.push(idx % 7 === 0 ? true : val > 0.45);
        hash = ((hash * 31 + idx) * 17 + c) | 0;
      }
    }
  }

  const cellSize = 4;
  const svgSize = size * cellSize;

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="rounded-sm"
    >
      <rect width={svgSize} height={svgSize} fill="#FFFFFF" />
      {cells.map((filled, i) => {
        if (!filled) return null;
        const r = Math.floor(i / size);
        const c = i % size;
        return (
          <rect
            key={i}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#0A0E1A"
          />
        );
      })}
    </svg>
  );
}

// ============================
// Shortcut Item Component
// ============================
function ShortcutItem({
  icon: Icon,
  label,
  delay,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  delay: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 py-4 rounded-md bg-bg-card border border-white/[0.06] active:border-coral/30 transition-colors"
    >
      <div className="w-11 h-11 rounded-full bg-coral/10 flex items-center justify-center">
        <Icon size={22} className="text-coral" strokeWidth={1.5} />
      </div>
      <span className="text-caption text-text-secondary">{label}</span>
    </motion.button>
  );
}

// ============================
// Credential Card Component
// ============================
function CredentialCard({
  credential,
  index,
}: {
  credential: (typeof VC_CREDENTIALS)[0];
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = credential.icon;
  const isIssued = credential.status === '已签发';

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.4 + index * 0.08,
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Card variant="interactive" padding="md" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${credential.color}15` }}
          >
            <Icon size={20} style={{ color: credential.color }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-body-sm font-medium text-text-primary truncate">
                {credential.name}
              </h4>
              <StatusBadge status={isIssued ? 'success' : 'warning'} size="sm">
                {credential.status}
              </StatusBadge>
            </div>
            <p className="text-caption text-text-muted mt-0.5">{credential.issuer}</p>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 mt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-text-muted">签发日期</p>
                      <p className="text-caption text-text-secondary">{credential.issueDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">有效期至</p>
                      <p className="text-caption text-text-secondary">{credential.expiryDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">凭证类型</p>
                      <p className="text-caption text-text-secondary">{credential.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">链上状态</p>
                      <p className="text-caption text-teal flex items-center gap-1">
                        <CheckCircle size={10} /> 已锚定
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ChevronRight
            size={16}
            className="text-text-muted shrink-0 mt-1"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </Card>
    </motion.div>
  );
}

// ============================
// Activity Log Item Component
// ============================
function ActivityItem({ log, index }: { log: (typeof ACTIVITY_LOGS)[0]; index: number }) {
  const isSuccess = log.status === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.5 + index * 0.06,
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0"
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isSuccess ? 'bg-teal/15' : 'bg-warning/15'
        }`}
      >
        <Activity size={14} className={isSuccess ? 'text-teal' : 'text-warning'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text-primary">{log.action}</p>
        <p className="text-caption text-text-muted">
          {log.target} · {log.time}
        </p>
      </div>
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${isSuccess ? 'bg-teal' : 'bg-warning'}`}
      />
    </motion.div>
  );
}

// ============================
// Main DID Identity Page
// ============================
export default function DidIdentity() {
  usePageTitle('DID身份中心');
  const addToast = useAppStore((s) => s.addToast);
  const [did] = useState(DID_DATA.did);
  const [shortDid] = useState(DID_DATA.shortDid);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState('connected');
  const [copied, setCopied] = useState(false);

  // Copy DID to clipboard
  const handleCopyDid = async () => {
    try {
      await navigator.clipboard.writeText(did);
      setCopied(true);
      addToast({
        title: 'DID已复制',
        description: '身份标识符已复制到剪贴板',
        type: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        title: '复制失败',
        description: '请手动复制DID',
        type: 'error',
      });
    }
  };

  // Share DID
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '太初国链 DID身份',
        text: `我的去中心化身份: ${shortDid}`,
      });
    } else {
      addToast({
        title: '分享功能',
        description: '您的设备不支持分享',
        type: 'info',
      });
    }
  };

  // Refresh blockchain status
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setBlockchainStatus('connected');
      addToast({
        title: '状态已刷新',
        description: 'DID链上状态已同步',
        type: 'success',
      });
    }, 1500);
  };

  // Shortcut handlers
  const handleShortcut = (label: string) => {
    addToast({
      title: label,
      description: `${label}功能即将上线`,
      type: 'info',
    });
  };

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Top Bar */}
      <TopBar
        title="DID身份中心"
        showBack
        rightAction={
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 flex items-center justify-center text-text-primary"
          >
            <Settings size={22} strokeWidth={1.5} />
          </motion.button>
        }
      />

      <div className="px-5 pt-3 pb-8 space-y-5">
        {/* Blockchain Status Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-2"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal" />
          </span>
          <span className="text-caption text-teal font-medium">{DID_DATA.blockchain} 已连接</span>
          <span className="text-caption text-text-muted">· {DID_DATA.encryption}</span>
        </motion.div>

        {/* DID Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="relative rounded-lg overflow-hidden p-5"
            style={{
              background: 'linear-gradient(135deg, #0A2540 0%, #111827 40%, #0A0E1A 100%)',
              border: '1px solid rgba(246, 166, 35, 0.25)',
            }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-coral/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-teal/5 translate-y-1/2 -translate-x-1/2" />

            {/* Card content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-coral" />
                  <span className="text-caption text-coral font-medium tracking-wider">
                    太初国链 DID
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-teal" />
                  <span className="text-[10px] text-teal font-medium">{DID_DATA.authStatus}</span>
                </div>
              </div>

              {/* QR Code + DID */}
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-md shadow-lg shrink-0">
                  <QRCodeSVG did={did} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-muted mb-1">DID标识符</p>
                  <p className="text-body-sm font-mono text-text-primary break-all leading-tight">
                    {shortDid}
                  </p>
                  <p className="text-[10px] text-text-muted mt-1.5">
                    创建日期: {DID_DATA.createdDate}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyDid}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded bg-white/[0.06] border border-white/[0.08] text-caption text-text-secondary hover:border-coral/30 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={13} className="text-teal" />
                      <span className="text-teal">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      复制DID
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded bg-white/[0.06] border border-white/[0.08] text-caption text-text-secondary hover:border-coral/30 transition-colors"
                >
                  <Share2 size={13} />
                  分享身份
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded bg-white/[0.06] border border-white/[0.08] text-caption text-text-secondary hover:border-coral/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                  刷新状态
                </motion.button>
              </div>

              {/* Last verified */}
              <p className="text-[10px] text-text-muted mt-3 text-center">
                上次验证: {DID_DATA.lastVerified}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Function Shortcuts Grid */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <h3 className="text-h4 text-text-primary mb-3">功能服务</h3>
          <div className="grid grid-cols-3 gap-2.5">
            <ShortcutItem
              icon={ShieldCheck}
              label="VC凭证管理"
              delay={0.15}
              onClick={() => handleShortcut('VC凭证管理')}
            />
            <ShortcutItem
              icon={Fingerprint}
              label="身份验证"
              delay={0.2}
              onClick={() => handleShortcut('身份验证')}
            />
            <ShortcutItem
              icon={Key}
              label="授权管理"
              delay={0.25}
              onClick={() => handleShortcut('授权管理')}
            />
            <ShortcutItem
              icon={Link}
              label="链上记录"
              delay={0.3}
              onClick={() => handleShortcut('链上记录')}
            />
            <ShortcutItem
              icon={EyeOff}
              label="隐私设置"
              delay={0.35}
              onClick={() => handleShortcut('隐私设置')}
            />
            <ShortcutItem
              icon={Download}
              label="备份恢复"
              delay={0.4}
              onClick={() => handleShortcut('备份恢复')}
            />
          </div>
        </motion.section>

        {/* VC Credentials Section */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-h4 text-text-primary">数字凭证 (VC)</h3>
            <span className="text-caption text-text-muted">
              {VC_CREDENTIALS.filter((c) => c.status === '已签发').length}/{VC_CREDENTIALS.length}{' '}
              已签发
            </span>
          </div>
          <div className="space-y-2.5">
            {VC_CREDENTIALS.map((credential, i) => (
              <CredentialCard key={credential.id} credential={credential} index={i} />
            ))}
          </div>
        </motion.section>

        {/* Recent Activity Section */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h3 className="text-h4 text-text-primary mb-3">最近活动</h3>
          <Card variant="default" padding="md">
            <div>
              {ACTIVITY_LOGS.map((log, i) => (
                <ActivityItem key={log.id} log={log} index={i} />
              ))}
            </div>
          </Card>
        </motion.section>

        {/* Blockchain Info */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                <Globe size={18} className="text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-body-sm text-text-primary">FISCO BCOS 联盟链</p>
                <p className="text-caption text-text-muted">
                  共识: PBFT · 区块高度: #8,452,301 · 国密支持
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            </div>
          </Card>
        </motion.section>

        {/* Security Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="flex items-start gap-2.5 pt-2"
        >
          <Lock size={13} className="text-text-muted shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            您的DID数据存储在FISCO
            BCOS区块链上，只有您持有私钥。太初国链不存储任何私钥信息，请妥善保管您的助记词。
          </p>
        </motion.div>
      </div>
    </div>
  );
}
