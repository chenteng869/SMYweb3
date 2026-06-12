import { IsInt, IsOptional, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 证据类型允许值 */
export const EVIDENCE_TYPE_VALUES = ['document', 'signature', 'report'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPE_VALUES)[number];

/**
 * 创建区块链存证请求 DTO
 */
export class CreateEvidenceDto {
  /** 文件存储记录 ID（必填，关联 FileStorage 表） */
  @ApiProperty({ description: '文件存储记录 ID（必填，关联 FileStorage 表）' })
  @IsInt()
  fileId: number;

  /** DID 标识 ID（可选） */
  @ApiPropertyOptional({ description: 'DID 标识 ID（可选）' })
  @IsOptional()
  @IsInt()
  didId?: number;

  /** 证据类型：文档 / 签名 / 报告 */
  @ApiPropertyOptional({ enum: EVIDENCE_TYPE_VALUES, description: '证据类型：文档 / 签名 / 报告' })
  @IsOptional()
  @IsString()
  @IsIn([...EVIDENCE_TYPE_VALUES])
  evidenceType?: string;

  /** 额外元数据（JSON 字符串） */
  @ApiPropertyOptional({ description: '额外元数据（JSON 字符串）' })
  @IsOptional()
  @IsString()
  metadata?: string;
}

/**
 * 验证区块链存证请求 DTO
 */
export class VerifyEvidenceDto {
  /** 存证记录 ID */
  @IsInt()
  evidenceId: number;
}

/**
 * 查询区块链存证列表请求 DTO
 */
export class QueryEvidenceDto {
  /** 按文件 ID 筛选 */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  fileId?: number;

  /** 按交易哈希筛选 */
  @IsOptional()
  @IsString()
  txHash?: string;

  /** 按 DID ID 筛选 */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  didId?: number;

  /** 分页页码（从 1 开始） */
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  /** 每页条数 */
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
