import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive' | 'featured';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    const baseClasses = 'rounded-md border border-white/[0.08] overflow-hidden';

    const variantClasses = {
      default: 'bg-bg-card',
      elevated: 'bg-bg-card shadow-card-elevated',
      glass: 'glass border-white/[0.05]',
      interactive:
        'bg-bg-card cursor-pointer active:scale-[0.96] transition-transform duration-100',
      featured: 'bg-gradient-to-b from-bg-card to-bg-dark border-l-[3px] border-l-coral',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], paddingMap[padding], className)}
        whileHover={
          variant === 'interactive'
            ? {
                backgroundColor: 'rgba(26, 34, 53, 1)',
                borderColor: 'rgba(246, 166, 35, 0.4)',
              }
            : undefined
        }
        transition={{ duration: 0.15 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
