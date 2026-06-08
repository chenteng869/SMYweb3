import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  Bell, CheckCircle, AlertTriangle, Info, ChevronRight,
  CheckCheck, Archive, Sparkles, ShoppingBag, Shield,
  TrendingUp, Award, X, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import Skeleton from '@/components/shared/Skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

// ============================
// Enhanced Notification Type
// ============================
type NotifCategory = 'system' | 'business' | 'ai';

interface EnhancedNotification extends Notification {
  category: NotifCategory;
  time: string;
}

// ============================
// Category Config
// ============================
const categoryConfig: Record<NotifCategory, { label: string; color: string; bg: string }> = {
  system: { label: '系统', color: 'text-teal', bg: 'bg-teal/10' },
  business: { label: '业务', color: 'text-warning', bg: 'bg-warning/10' },
  ai: { label: 'AI推荐', color: 'text-coral', bg: 'bg-coral/10' },
};

const typeIconConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: 'text-teal', bg: 'bg-teal/10' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  info: { icon: Info, color: 'text-coral', bg: 'bg-coral/10' },
  error: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' },
};

// ============================
// Filter Tabs
// ============================
const filterTabs = [
  { id: 'all', label: '全部' },
  { id: 'system', label: '系统' },
  { id: 'business', label: '业务' },
  { id: 'ai', label: 'AI推荐' },
] as const;

// ============================
// Mock Enhanced Notifications
// ============================
const mockEnhancedNotifications: EnhancedNotification[] = [
  {
    id: 'notif_001', title: '萨摩亚公司年审提醒', message: '太初国际（萨摩亚）有限公司年度申报将于7天后到期，请及时处理。',
    type: 'warning', read: false, timestamp: '2024-12-19T10:30:00', actionUrl: '/documents',
    category: 'system', time: '10:30',
  },
  {
    id: 'notif_002', title: '巴西买家发起退换货申请', message: '订单 #RMA-2026-001 买家要求退换货，请尽快处理。',
    type: 'warning', read: false, timestamp: '2024-12-19T09:15:00',
    category: 'business', time: '09:15',
  },
  {
    id: 'notif_003', title: 'AI汇率官：USD/CNY触及7.20', message: '当前汇率7.1956，接近您的设定阈值7.20，建议关注换汇时机。',
    type: 'info', read: false, timestamp: '2024-12-19T08:00:00',
    category: 'ai', time: '08:00',
  },
  {
    id: 'notif_004', title: '香港银行账户开户申请已提交', message: '您的香港汇丰银行账户开户申请已提交审核，预计3-5个工作日完成。',
    type: 'success', read: true, timestamp: '2024-12-18T16:45:00',
    category: 'system', time: '16:45',
  },
  {
    id: 'notif_005', title: 'AI选品官发现3个潜力爆品', message: '泰国市场智能家居品类发现3个高增长潜力产品，预估利润率35-50%。',
    type: 'info', read: true, timestamp: '2024-12-18T14:20:00', actionUrl: '/ai-chat/agent_003',
    category: 'ai', time: '14:20',
  },
  {
    id: 'notif_006', title: 'DLC等级已提升至L6大师', message: '恭喜！您的DLC等级已提升至「L6大师」，解锁全部专属权益。',
    type: 'success', read: true, timestamp: '2024-12-15T09:00:00', actionUrl: '/dlc-level',
    category: 'system', time: '3天前',
  },
  {
    id: 'notif_007', title: 'Stripe费率调整通知', message: 'Stripe欧洲卡组织费率将于明年1月上调0.3%，建议提前评估。',
    type: 'warning', read: true, timestamp: '2024-12-12T11:00:00',
    category: 'business', time: '7天前',
  },
  {
    id: 'notif_008', title: 'AI法务精灵完成合同审查', message: '您的供应商合同已审查完毕，发现1个中风险条款建议修改。',
    type: 'info', read: false, timestamp: '2024-12-19T07:30:00', actionUrl: '/ai-chat/agent_002',
    category: 'ai', time: '07:30',
  },
];

// ============================
// Date Grouping Helper
// ============================
function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ============================
// Swipeable Notification Item
// ============================
interface SwipeableItemProps {
  notification: EnhancedNotification;
  index: number;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}

function SwipeableNotificationItem({ notification, index, onDismiss, onRead }: SwipeableItemProps) {
  const x = useRef(0);
  const typeConf = typeIconConfig[notification.type];
  const catConf = categoryConfig[notification.category];
  const Icon = typeConf.icon;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      onDismiss(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-md"
    >
      {/* Swipe Background (Dismiss) */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 bg-danger/90">
        <Archive size={20} className="text-white" />
      </div>

      {/* Foreground */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        onDrag={(_, info) => { x.current = info.offset.x; }}
        style={{ x: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onRead(notification.id)}
        className="relative z-10"
      >
        <Card
          variant={notification.read ? 'default' : 'interactive'}
          padding="md"
          className={cn(!notification.read && 'border-l-[3px] border-l-coral')}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', typeConf.bg)}>
              <Icon size={18} className={typeConf.color} />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {/* Category Badge */}
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-sm font-medium', catConf.bg, catConf.color)}>
                  {catConf.label}
                </span>
                <h3 className={cn(
                  'text-body-sm truncate',
                  notification.read ? 'text-text-secondary' : 'text-text-primary font-medium'
                )}>
                  {notification.title}
                </h3>
                {!notification.read && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-coral shrink-0"
                  />
                )}
              </div>
              <p className="text-caption text-text-muted mt-1 line-clamp-2">{notification.message}</p>
              <p className="text-[10px] text-text-muted mt-1.5">{notification.time}</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ============================
// Empty State
// ============================
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center mb-4"
      >
        <Bell size={32} className="text-text-muted" />
      </motion.div>
      <h3 className="text-h4 text-text-primary mb-1">暂无消息</h3>
      <p className="text-body-sm text-text-muted">当您有新通知时，会显示在这里</p>
    </motion.div>
  );
}

// ============================
// Main Component
// ============================
export default function Notifications() {
  usePageTitle('消息通知');
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifications = useAppStore(s => s.notifications);
  const markNotificationRead = useAppStore(s => s.markNotificationRead);
  const setNotifications = useAppStore(s => s.setNotifications);

  // Merge store notifications with enhanced mock data
  const allNotifications: EnhancedNotification[] = mockEnhancedNotifications.map(n => ({
    ...n,
    read: notifications.find(sn => sn.id === n.id)?.read ?? n.read,
  }));

  // Filter
  const filteredNotifications = allNotifications.filter(n => {
    if (dismissedIds.has(n.id)) return false;
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  // Group by date
  const grouped = filteredNotifications.reduce<Record<string, EnhancedNotification[]>>((acc, n) => {
    const group = getDateGroup(n.timestamp);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const dateGroups = Object.entries(grouped);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    markNotificationRead(id);
  }, [markNotificationRead]);

  const handleMarkAllRead = useCallback(() => {
    filteredNotifications.forEach(n => {
      if (!n.read) markNotificationRead(n.id);
    });
  }, [filteredNotifications, markNotificationRead]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen"
    >
      {/* Header */}
      <TopBar
        title="消息通知"
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              className={cn(
                'w-10 h-10 flex items-center justify-center text-text-muted',
                isRefreshing && 'animate-spin'
              )}
            >
              <RefreshCw size={18} />
            </motion.button>
          </div>
        }
      />

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Unread count + Mark all read */}
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-text-secondary">
            {unreadCount > 0 ? `${unreadCount} 条未读` : '全部已读'}
          </span>
          {unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkAllRead}
              className="text-caption text-coral flex items-center gap-1 px-2 py-1 rounded-md hover:bg-coral/10 transition-colors"
            >
              <CheckCheck size={14} />
              全部已读
            </motion.button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-bg-card rounded-md border border-white/[0.06]">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            const count = tab.id === 'all'
              ? allNotifications.filter(n => !n.read).length
              : allNotifications.filter(n => n.category === tab.id && !n.read).length;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-1 py-2 rounded-sm text-body-sm transition-colors',
                  isActive ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="notifFilterTab"
                    className="absolute inset-0 bg-bg-elevated rounded-sm border border-white/[0.08]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="relative z-10 text-[9px] bg-coral text-bg-dark rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold"
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Notification List */}
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {dateGroups.map(([group, items]) => (
                <div key={group} className="space-y-2">
                  {/* Date Header */}
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-caption text-text-muted px-1 font-medium"
                  >
                    {group}
                  </motion.h3>
                  {/* Items */}
                  <div className="space-y-2">
                    <AnimatePresence>
                      {items.map((notif, i) => (
                        <SwipeableNotificationItem
                          key={notif.id}
                          notification={notif}
                          index={i}
                          onDismiss={handleDismiss}
                          onRead={handleMarkRead}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
