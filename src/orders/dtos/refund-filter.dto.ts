import { IsInt, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { RefundStatus } from '@prisma/client';
import { BasePaginationDto } from '../../shared/dtos';

export class RefundFilterDto extends BasePaginationDto {
  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
