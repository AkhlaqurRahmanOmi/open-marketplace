import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RefundStatus } from '@prisma/client';

export class UpdateRefundDto {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
