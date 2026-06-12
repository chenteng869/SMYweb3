// @ts-nocheck
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Globe,
  Moon,
  ChevronRight,
  LogOut,
  Smartphone,
  Languages,
  DollarSign,
  FileText,
  HelpCircle,
  Mail,
  Phone,
  Edit3,
  Fingerprint,
  Lock,
  RefreshCw,
  MessageCircle,
  Info,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import Skeleton from '@/components/shared/Skeleton';

// ============================
// Toggle Switch Component
// ============================
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!enabled)}
      className={cn(
        'w-11 h-6 rounded-full relative transition-colors duration-200',
        enabled ? 'bg-coral' : 'bg-bg-elevated border border-white/[0.1]'
      )}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-sm"
        animate={{ left: enabled ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

// ============================
// Section Header Component
// ============================
function SectionHeader({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <motion.h2
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="text-caption text-text-muted uppercase tracking-wider mb-2 px-1 font-medium"
    >
      {title}
    </motion.h2>
  );
}

// ============================
// Settings Row Component
// ============================
interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  suffix?: React.ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  delay?: number;
}

function SettingsRow({
  icon,
  label,
  value,
  suffix,
  onClick,
  showArrow = true,
  danger = false,
  delay = 0,
}: SettingsRowProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 text-left',
        'hover:bg-white/[0.02] transition-colors duration-150',
        onClick && 'active:scale-[0.99]'
      )}
    >
      <span className={cn('shrink-0', danger ? 'text-danger' : 'text-text-muted')}>{icon}</span>
      <span className={cn('flex-1 text-body-sm', danger ? 'text-danger' : 'text-text-primary')}>
        {label}
      </span>
      {value && <span className="text-caption text-text-muted">{value}</span>}
      {suffix}
      {showArrow && <ChevronRight size={16} className="text-text-muted shrink-0" />}
    </motion.button>
  );
}

// ============================
// Divider
// ============================
function Divider() {
  return <div className="h-px bg-white/[0.06] mx-4" />;
}

// ============================
// Card Container
// ============================
function SettingsCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-md border border-white/[0.08] bg-bg-card overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

// ============================
// Main Component
// ============================
export default function Settings() {
  usePageTitle('设置');
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const addToast = useAppStore((s) => s.addToast);

  // Loading state simulation
  const [isLoading] = useState(false);

  // State
  const [darkMode, setDarkMode] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [biometricUnlock, setBiometricUnlock] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [language, setLanguage] = useState('中文');
  const [currency, setCurrency] = useState('USD');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const handleLogout = () => {
    setAuthenticated(false);
    addToast({ title: '已退出登录', description: '期待您的再次访问', type: 'info' });
    navigate('/');
  };

  const handleSettingClick = (label: string) => {
    addToast({ title: label, description: '功能开发中，敬请期待', type: 'info' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-50 h-12 flex items-center px-4 glass-light border-b border-white/[0.06]">
          <Skeleton variant="rect" width="60px" height="20px" />
          <div className="flex-1" />
          <Skeleton variant="rect" width="40px" height="20px" />
        </div>
        <div className="px-5 pt-4 pb-6 space-y-5">
          <Skeleton variant="card" />
          <Skeleton variant="text" lines={4} />
          <Skeleton variant="text" lines={3} />
          <Skeleton variant="text" lines={3} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pb-8"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 h-12 flex items-center gap-3 px-4 glass-light border-b border-white/[0.06]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2 text-text-primary"
        >
          <ArrowLeft size={22} />
        </motion.button>
        <h1 className="flex-1 text-h3 text-text-primary text-center -ml-6">设置</h1>
      </div>

      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Account Section */}
        <section>
          <SectionHeader title="账户设置" delay={0} />
          <SettingsCard delay={0.05}>
            {/* Avatar & Name */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4 px-4 py-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center text-bg-dark font-display text-h1">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-bg-card border-2 border-bg-card flex items-center justify-center">
                  <Edit3 size={10} className="text-coral" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-h4 text-text-primary">{user?.name || '陈董'}</h2>
                <p className="text-body-sm text-text-secondary mt-0.5">
                  {user?.email || 'chendong@taichu.com'}
                </p>
                <p className="text-caption text-text-muted mt-0.5">DLC LV.{user?.dlcLevel || 6}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSettingClick('修改资料')}
                className="text-caption text-coral px-3 py-1 rounded-full bg-coral/10"
              >
                修改
              </motion.button>
            </motion.div>

            <Divider />

            {/* Phone */}
            <SettingsRow
              icon={<Phone size={20} strokeWidth={1.5} />}
              label="手机号"
              value={user?.phone || '+86 138****8888'}
              showArrow={false}
              delay={0.15}
              suffix={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSettingClick('更换手机号');
                  }}
                  className="text-caption text-coral px-2 py-0.5 rounded-full bg-coral/10"
                >
                  更换
                </motion.button>
              }
            />

            <Divider />

            {/* Email */}
            <SettingsRow
              icon={<Mail size={20} strokeWidth={1.5} />}
              label="邮箱"
              value={user?.email ? '已绑定' : '未绑定'}
              showArrow={false}
              delay={0.2}
              suffix={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSettingClick('绑定邮箱');
                  }}
                  className="text-caption text-coral px-2 py-0.5 rounded-full bg-coral/10"
                >
                  {user?.email ? '更换' : '绑定'}
                </motion.button>
              }
            />
          </SettingsCard>
        </section>

        {/* Security Section */}
        <section>
          <SectionHeader title="安全设置" delay={0.2} />
          <SettingsCard delay={0.25}>
            <SettingsRow
              icon={<Lock size={20} strokeWidth={1.5} />}
              label="修改密码"
              delay={0.25}
              onClick={() => handleSettingClick('修改密码')}
            />
            <Divider />
            <SettingsRow
              icon={<Fingerprint size={20} strokeWidth={1.5} />}
              label="指纹/面容ID解锁"
              delay={0.28}
              showArrow={false}
              suffix={<ToggleSwitch enabled={biometricUnlock} onChange={setBiometricUnlock} />}
            />
            <Divider />
            <SettingsRow
              icon={<Shield size={20} strokeWidth={1.5} />}
              label="两步验证"
              value={twoFactorEnabled ? '已开启' : '未开启'}
              delay={0.3}
              onClick={() => handleSettingClick('两步验证')}
            />
          </SettingsCard>
        </section>

        {/* Preferences Section */}
        <section>
          <SectionHeader title="偏好设置" delay={0.3} />
          <SettingsCard delay={0.35}>
            {/* Language */}
            <div className="relative">
              <SettingsRow
                icon={<Languages size={20} strokeWidth={1.5} />}
                label="语言"
                value={language}
                delay={0.35}
                showArrow={!showLangDropdown}
                suffix={
                  showLangDropdown ? <ChevronDown size={16} className="text-coral" /> : undefined
                }
                onClick={() => setShowLangDropdown(!showLangDropdown)}
              />
              {showLangDropdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-bg-dark/50 px-4 pb-2"
                >
                  {['中文', 'English', '日本語'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLangDropdown(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 rounded-md text-body-sm',
                        language === lang
                          ? 'text-coral bg-coral/10'
                          : 'text-text-secondary hover:bg-white/[0.02]'
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <Divider />
            {/* Currency */}
            <div className="relative">
              <SettingsRow
                icon={<DollarSign size={20} strokeWidth={1.5} />}
                label="货币显示"
                value={currency}
                delay={0.38}
                showArrow={!showCurrencyDropdown}
                suffix={
                  showCurrencyDropdown ? (
                    <ChevronDown size={16} className="text-coral" />
                  ) : undefined
                }
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              />
              {showCurrencyDropdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-bg-dark/50 px-4 pb-2"
                >
                  {['USD', 'CNY', 'EUR', 'SGD', 'HKD'].map((cur) => (
                    <button
                      key={cur}
                      onClick={() => {
                        setCurrency(cur);
                        setShowCurrencyDropdown(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 rounded-md text-body-sm',
                        currency === cur
                          ? 'text-coral bg-coral/10'
                          : 'text-text-secondary hover:bg-white/[0.02]'
                      )}
                    >
                      {cur}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <Divider />
            <SettingsRow
              icon={<Moon size={20} strokeWidth={1.5} />}
              label="深色模式"
              delay={0.4}
              showArrow={false}
              suffix={<ToggleSwitch enabled={darkMode} onChange={setDarkMode} />}
            />
            <Divider />
            <SettingsRow
              icon={<Bell size={20} strokeWidth={1.5} />}
              label="通知推送"
              delay={0.42}
              showArrow={false}
              suffix={<ToggleSwitch enabled={pushNotifications} onChange={setPushNotifications} />}
            />
          </SettingsCard>
        </section>

        {/* About Section */}
        <section>
          <SectionHeader title="关于" delay={0.45} />
          <SettingsCard delay={0.5}>
            <SettingsRow
              icon={<Info size={20} strokeWidth={1.5} />}
              label="版本号"
              value="v1.0.0"
              delay={0.5}
              showArrow={false}
            />
            <Divider />
            <SettingsRow
              icon={<FileText size={20} strokeWidth={1.5} />}
              label="用户协议"
              delay={0.52}
              onClick={() => handleSettingClick('用户协议')}
            />
            <Divider />
            <SettingsRow
              icon={<Shield size={20} strokeWidth={1.5} />}
              label="隐私政策"
              delay={0.54}
              onClick={() => handleSettingClick('隐私政策')}
            />
            <Divider />
            <SettingsRow
              icon={<HelpCircle size={20} strokeWidth={1.5} />}
              label="帮助中心"
              delay={0.56}
              onClick={() => handleSettingClick('帮助中心')}
            />
            <Divider />
            <SettingsRow
              icon={<MessageCircle size={20} strokeWidth={1.5} />}
              label="联系我们"
              delay={0.58}
              onClick={() => handleSettingClick('联系我们')}
            />
          </SettingsCard>
        </section>

        {/* Danger Zone */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-danger text-body-sm rounded-md border border-danger/20 bg-danger/5 hover:bg-danger/10 transition-colors active:scale-[0.99]"
          >
            <LogOut size={18} />
            退出登录
          </button>
          <p className="text-center text-[10px] text-text-muted mt-4">
            太初国链 v1.0.0 · 萨摩亚SPV × 海购星Dapp
          </p>
        </motion.section>
      </div>
    </motion.div>
  );
}
