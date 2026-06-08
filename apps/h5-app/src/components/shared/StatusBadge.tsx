import { cn } from '@/lib/utils';

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'accent' | 'default';

export interface StatusBadgeProps {
  status: BadgeStatus;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<BadgeStatus, { bg: string; text: string; label: string }> = {
  success: { bg: 'bg-teal/15', text: 'text-teal', label: '已完成' },
  warning: { bg: 'bg-warning/15', text: 'text-warning', label: '待处理' },
  danger: { bg: 'bg-danger/15', text: 'text-danger', label: '异常' },
  accent: { bg: 'bg-coral/15', text: 'text-coral', label: '进行中' },
  default: { bg: 'bg-bg-elevated', text: 'text-text-secondary', label: '默认' },
};

export default function StatusBadge({ status = 'default', children, className, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-sm font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-badge' : 'px-3 py-1 text-caption',
        config.bg,
        config.text,
        className
      )}
    >
      {children || config.label}
    </span>
  );
}

// Convenience exports for common statuses
export function SuccessBadge({ children, className, size }: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status="success" className={className} size={size}>{children || '已完成'}</StatusBadge>;
}

export function WarningBadge({ children, className, size }: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status="warning" className={className} size={size}>{children || '待处理'}</StatusBadge>;
}

export function DangerBadge({ children, className, size }: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status="danger" className={className} size={size}>{children || '异常'}</StatusBadge>;
}

export function AccentBadge({ children, className, size }: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status="accent" className={className} size={size}>{children || '进行中'}</StatusBadge>;
}
