import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FreezeDidDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'reason 不能超过500字符' })
  reason?: string;
}

export class RevokeDidDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'reason 不能超过500字符' })
  reason?: string;
}
