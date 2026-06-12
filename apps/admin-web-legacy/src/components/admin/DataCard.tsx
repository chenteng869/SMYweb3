'use client';

import React from 'react';
import { Card, Statistic, Row, Col, Tooltip } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  ShoppingOutlined,
  HeartOutlined,
  RiseOutlined,
  FallOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

interface DataCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'none';
  trendValue?: string;
  description?: string;
  loading?: boolean;
  onClick?: () => void;
  action?: React.ReactNode;
}

export function DataCard({
  title,
  value,
  icon = <UserOutlined />,
  color = '#1890ff',
  prefix,
  suffix,
  trend = 'none',
  trendValue,
  description,
  loading = false,
  onClick,
  action,
}: DataCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') {
      return <RiseOutlined style={{ color: '#52c41a' }} />;
    }
    if (trend === 'down') {
      return <FallOutlined style={{ color: '#ff4d4f' }} />;
    }
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return '#52c41a';
    if (trend === 'down') return '#ff4d4f';
    return '#999';
  };

  return (
    <Card
      className="data-card"
      hoverable={!!onClick}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      loading={loading}
      actions={action ? [action] : undefined}
    >
      <Row align="middle" gutter={16}>
        <Col>
          <div
            className="data-card-icon"
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color,
            }}
          >
            {icon}
          </div>
        </Col>
        <Col flex="auto">
          <Statistic
            title={<span className="text-gray-500 text-sm">{title}</span>}
            value={value}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{ fontSize: 28, fontWeight: 600, color: '#333' }}
          />

          {trend !== 'none' && trendValue && (
            <div className="flex items-center mt-2">
              {getTrendIcon()}
              <span
                style={{
                  color: getTrendColor(),
                  marginLeft: 4,
                  fontSize: 13,
                }}
              >
                {trendValue}
                <span className="text-gray-400 ml-1">较上期</span>
              </span>
            </div>
          )}

          {description && <div className="text-gray-400 text-xs mt-2">{description}</div>}
        </Col>
      </Row>
    </Card>
  );
}

// 预设数据卡片
export function UserDataCard(props: Partial<DataCardProps>) {
  return <DataCard title="总用户数" value={0} icon={<UserOutlined />} color="#1890ff" {...props} />;
}

export function RevenueDataCard(props: Partial<DataCardProps>) {
  return (
    <DataCard
      title="总收入"
      value={0}
      prefix="$"
      icon={<DollarOutlined />}
      color="#52c41a"
      {...props}
    />
  );
}

export function TransactionDataCard(props: Partial<DataCardProps>) {
  return (
    <DataCard title="交易笔数" value={0} icon={<ShoppingOutlined />} color="#722ed1" {...props} />
  );
}

export function NFTDataCard(props: Partial<DataCardProps>) {
  return (
    <DataCard title="NFT 铸造" value={0} icon={<HeartOutlined />} color="#fa8c16" {...props} />
  );
}

export { DataCard as default };
