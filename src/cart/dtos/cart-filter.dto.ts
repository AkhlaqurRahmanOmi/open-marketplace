import { IsOptional, IsEnum, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BasePaginationDto } from '../../shared/dtos/base-pagination.dto';
import { CartStatus } from '@prisma/client';

export class CartFilterDto extends BasePaginationDto {
  @IsOptional()
  @IsEnum(CartStatus)
  status?: CartStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
