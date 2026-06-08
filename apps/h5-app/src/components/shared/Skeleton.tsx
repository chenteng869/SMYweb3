import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card';
  lines?: number;
  width?: string;
  height?: string;
}

export default function Skeleton({
  className,
  variant = 'rect',
  lines = 1,
  width,
  height,
}: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer rounded"
            style={{
              width: width || `${100 - (i % 3) * 20}%`,
              height: height || '16px',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div
        className={cn('skeleton-shimmer rounded-full', className)}
        style={{ width: width || '48px', height: height || '48px' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('bg-bg-card border border-white/[0.08] rounded-md p-4', className)}>
        <div className="skeleton-shimmer rounded h-4 w-1/3 mb-3" />
        <div className="skeleton-shimmer rounded h-8 w-2/3 mb-2" />
        <div className="skeleton-shimmer rounded h-3 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      style={{ width, height }}
    />
  );
}

// Preset skeleton layouts for common use cases
export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton variant="card" className={className} />;
}

export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return <Skeleton variant="text" lines={lines} className={className} />;
}

export function SkeletonCircle({ size = '48px', className }: { size?: string; className?: string }) {
  return <Skeleton variant="circle" width={size} height={size} className={className} />;
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonCircle size="40px" />
          <div className="flex-1">
            <Skeleton variant="text" lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}
