import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class RegisterDidDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty({ message: 'userId 不能为空' })
  userId: number;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'primaryWallet 必须是有效的以太坊地址' })
  primaryWallet?: string;
}
