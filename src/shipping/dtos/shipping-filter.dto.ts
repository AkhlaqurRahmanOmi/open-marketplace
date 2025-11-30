import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ShippingMethodType } from '@prisma/client';
import { BasePaginationDto } from '../../shared/dtos/base-pagination.dto';

export class ShippingFilterDto extends BasePaginationDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @IsEnum(ShippingMethodType)
  @IsOptional()
  type?: ShippingMethodType;
}
