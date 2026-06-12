import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  trendLabel,
  icon,
  className,
  delay = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1200;
          const steps = 30;
          const stepDuration = duration / steps;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(value * eased);

            if (step >= steps) {
              setDisplayValue(value);
              clearInterval(timer);
            }
          }, stepDuration);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, hasAnimated]);

  const trendUp = trend && trend > 0;
  const trendDown = trend && trend < 0;
  const trendNeutral = trend === 0;

  return (
    <motion.div
      ref={ref}
      className={cn('bg-bg-card border border-white/[0.08] rounded-md p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={hasAnimated ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: delay * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-body-sm text-text-secondary">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>

      <div className="font-display text-h1 text-gradient-kpi mb-1">
        {prefix}
        {formatNumber(displayValue, decimals)}
        {suffix}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {trendUp && <TrendingUp size={14} className="text-teal" />}
          {trendDown && <TrendingDown size={14} className="text-red-500" />}
          {trendNeutral && <Minus size={14} className="text-text-muted" />}
          <span
            className={cn(
              'text-caption font-medium',
              trendUp && 'text-teal',
              trendDown && 'text-red-500',
              trendNeutral && 'text-text-muted'
            )}
          >
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
          {trendLabel && <span className="text-caption text-text-muted ml-1">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
