'use client';

import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Popconfirm,
  Tooltip,
  Dropdown,
  type TableProps,
  message,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Option } = Select;

interface Action {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  onClick?: (record: any) => void;
  danger?: boolean;
  hidden?: (record: any) => boolean;
  disabled?: (record: any) => boolean;
  confirm?: {
    title: string;
    description?: string;
    onConfirm: (record: any) => void | Promise<void>;
  };
}

interface DataTableProps {
  columns: TableProps<any>['columns'];
  dataSource: any[];
  loading?: boolean;
  title?: string;
  showSearch?: boolean;
  showAdd?: boolean;
  addButtonText?: string;
  onAdd?: () => void;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  showFilter?: boolean;
  filterOptions?: {
    label: string;
    value: string;
  }[];
  onFilter?: (value: string) => void;
  actions?: Action[];
  rowKey?: string;
  pagination?: TableProps<any>['pagination'];
  rowSelection?: TableProps<any>['rowSelection'];
  expandable?: TableProps<any>['expandable'];
}

export function DataTable({
  columns,
  dataSource,
  loading = false,
  title,
  showSearch = true,
  showAdd = true,
  addButtonText = '新增',
  onAdd,
  onRefresh,
  searchPlaceholder = '搜索...',
  onSearch,
  showFilter = false,
  filterOptions,
  onFilter,
  actions = [],
  rowKey = 'id',
  pagination = {
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  },
  rowSelection,
  expandable,
}: DataTableProps) {
  const [searchText, setSearchText] = useState('');
  const [filterValue, setFilterValue] = useState<string>('');

  const handleSearch = (value: string) => {
    setSearchText(value);
    onSearch?.(value);
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
    onFilter?.(value);
  };

  const handleAction = async (action: Action, record: any) => {
    if (action.confirm) {
      // 确认操作
    } else if (action.onClick) {
      action.onClick(record);
    }
  };

  const renderActions = (record: any) => {
    if (actions.length === 0) return null;

    const visibleActions = actions.filter(action => 
      !action.hidden || !action.hidden(record)
    );

    if (visibleActions.length <= 3) {
      return (
        <Space size="small">
          {visibleActions.map(action => {
            const isDisabled = action.disabled?.(record) || false;
            
            if (action.confirm) {
              return (
                <Popconfirm
                  key={action.key}
                  title={action.confirm.title}
                  description={action.confirm.description}
                  onConfirm={() => action.confirm?.onConfirm(record)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type={action.type || 'link'}
                    icon={action.icon}
                    size="small"
                    danger={action.danger}
                    disabled={isDisabled}
                  >
                    {action.label}
                  </Button>
                </Popconfirm>
              );
            }

            return (
              <Tooltip key={action.key} title={action.label}>
                <Button
                  type={action.type || 'link'}
                  icon={action.icon}
                  size="small"
                  danger={action.danger}
                  disabled={isDisabled}
                  onClick={() => action.onClick?.(record)}
                >
                  {action.label}
                </Button>
              </Tooltip>
            );
          })}
        </Space>
      );
    }

    // 更多操作使用下拉菜单
    const menuItems = visibleActions.map(action => {
      const isDisabled = action.disabled?.(record) || false;
      return {
        key: action.key,
        label: action.label,
        icon: action.icon,
        danger: action.danger,
        disabled: isDisabled,
        onClick: () => {
          if (action.confirm) {
            // 显示确认对话框
          } else {
            action.onClick?.(record);
          }
        },
      };
    });

    return (
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button type="text" icon={<MoreOutlined />} size="small" />
      </Dropdown>
    );
  };

  const allColumns = [...(columns || [])];

  if (actions.length > 0) {
    allColumns.push({
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => renderActions(record),
    });
  }

  return (
    <div className="data-table-wrapper">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2 flex-1">
          {title && <h2 className="text-lg font-semibold m-0">{title}</h2>}
          
          {showSearch && (
            <Input.Search
              placeholder={searchPlaceholder}
              allowClear
              style={{ width: 240 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          )}

          {showFilter && filterOptions && (
            <Select
              placeholder="筛选"
              style={{ width: 160 }}
              allowClear
              value={filterValue || undefined}
              onChange={handleFilter}
            >
              {filterOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          )}
        </div>

        <Space>
          {onRefresh && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
            >
              刷新
            </Button>
          )}
          
          {showAdd && onAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAdd}
            >
              {addButtonText}
            </Button>
          )}
        </Space>
      </div>

      {/* 表格 */}
      <Table
        columns={allColumns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
        expandable={expandable}
        scroll={{ x: 'max-content' }}
        bordered
      />
    </div>
  );
}

export { Tag };
