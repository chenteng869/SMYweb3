import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GradientButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
  isLoading?: boolean;
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = true,
      className,
      children,
      isLoading,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'relative overflow-hidden rounded-md font-semibold flex items-center justify-center gap-2 transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth && 'w-full'
    );

    const sizeClasses = {
      sm: 'h-10 px-4 text-[13px]',
      md: 'h-12 px-6 text-[15px]',
      lg: 'h-14 px-8 text-[16px]',
    };

    const variantClasses = {
      primary: 'gradient-accent text-bg-dark font-semibold',
      secondary: 'bg-transparent border border-coral text-coral hover:bg-coral/10',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.08, ease: [0.34, 1.56, 0.64, 1] }}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            加载中...
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

GradientButton.displayName = 'GradientButton';

export default GradientButton;
