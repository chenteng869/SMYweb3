import { IsInt, IsOptional, IsString, IsIn, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 签署文档请求 DTO
 */
export class SignDocumentDto {
  @ApiProperty({ description: '目标文档 ID', example: 1 })
  @IsInt()
  @Min(1)
  documentId: number;

  @ApiPropertyOptional({
    description: '签名算法',
    enum: ['ECDSA', 'EdDSA', 'RSA', 'SM2'],
    default: 'ECDSA',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ECDSA', 'EdDSA', 'RSA', 'SM2'])
  algorithm?: 'ECDSA' | 'EdDSA' | 'RSA' | 'SM2' = 'ECDSA';
}

/**
 * 撤销签名请求 DTO
 */
export class RevokeSignatureDto {
  @ApiProperty({ description: '撤销原因说明', example: '文档内容已更新需重新签署' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

/**
 * 验证签名请求 DTO
 */
export class VerifySignatureDto {
  @ApiProperty({ description: '签名记录 ID', example: 1 })
  @IsInt()
  @Min(1)
  signatureId: number;
}
