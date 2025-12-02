import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { BasePaginationDto } from '../../shared/dtos';

export enum BalanceTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  HOLD = 'HOLD',
  RELEASE = 'RELEASE',
}

export class VendorBalanceQueryDto extends BasePaginationDto {
  @IsOptional()
  @IsEnum(BalanceTransactionType)
  type?: BalanceTransactionType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
