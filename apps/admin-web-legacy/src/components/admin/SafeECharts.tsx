'use client';

import React from 'react';

interface SafeEChartsProps {
  option: any;
  style?: React.CSSProperties;
  title?: string;
}

export const SafeECharts: React.FC<SafeEChartsProps> = ({
  option,
  style = { height: 300 },
  title,
}) => {
  const [echarts, setEcharts] = React.useState<any>(null);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    import('echarts-for-react')
      .then((module) => {
        if (mounted) setEcharts(() => module.default);
      })
      .catch(() => {
        if (mounted) setHasError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (hasError || !echarts) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          color: '#999',
        }}
      >
        {title || '图表功能开发中'}
      </div>
    );
  }

  const ReactECharts = echarts;
  return <ReactECharts option={option} style={style} />;
};

export default SafeECharts;
