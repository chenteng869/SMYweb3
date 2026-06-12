import { IsString, IsOptional, IsArray, IsEnum, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 单平台数据采集请求 DTO
 */
export class CollectDto {
  /** 目标平台: twitter | youtube | telegram | douyin | xiaohongshu */
  @IsString()
  platform: string;

  /** 搜索关键词或查询条件 */
  @IsString()
  query: string;

  /** 采集数量上限 */
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number;

  /** 平台特定选项（如地区、语言等） */
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

/**
 * 批量采集请求 DTO
 */
export class BatchCollectDto {
  /** 采集任务列表 */
  @IsArray()
  tasks: any[];
}

/**
 * 数据导出请求 DTO
 */
export class ExportDto {
  /** 过滤条件 */
  @IsOptional()
  @IsObject()
  filters?: {
    platform?: string;
    minScore?: number;
    maxScore?: number;
    dateFrom?: string;
    dateTo?: string;
    tags?: string[];
    hasContact?: boolean;
  };

  /** 导出格式 */
  @IsEnum(['csv', 'json'])
  format: 'csv' | 'json';

  /** 日期范围筛选 */
  @IsOptional()
  @IsObject()
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * 定时采集配置 DTO
 */
export class ScheduleCollectionDto {
  /** Cron 表达式 */
  @IsString()
  cronExpression: string;

  /** 采集任务配置 */
  @IsObject()
  config: CollectionConfig;

  /** 时区（默认 Asia/Shanghai） */
  @IsOptional()
  @IsString()
  timezone?: string;
}

/**
 * 采集任务配置
 */
export interface CollectionConfig {
  /** 任务名称 */
  name: string;
  /** 采集任务列表 */
  tasks: Array<{
    platform: string;
    query: string;
    options?: Record<string, any>;
  }>;
  /** 关联的营销活动 ID */
  campaignId?: string;
  /** 是否启用去重 */
  enableDeduplication?: boolean;
  /** 是否启用评分 */
  enableScoring?: boolean;
  /** 是否自动保存到数据库 */
  autoSave?: boolean;
}

/**
 * 分页查询参数
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
