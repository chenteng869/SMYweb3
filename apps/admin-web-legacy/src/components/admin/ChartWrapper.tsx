'use client';

import React from 'react';

interface ChartWrapperProps {
  title?: string;
  height?: number | string;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  height = 300,
  children,
  fallback,
}) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError || !children) {
    return (
      fallback || (
        <div
          style={{
            height: typeof height === 'number' ? `${height}px` : height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            color: '#999',
          }}
        >
          {title ? `${title} (开发中)` : '图表功能开发中'}
        </div>
      )
    );
  }

  return <>{children}</>;
};

export default ChartWrapper;
