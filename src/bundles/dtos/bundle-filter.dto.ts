import { IsOptional, IsBoolean, IsString, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BasePaginationDto } from '../../shared/dtos';

export class BundleFilterDto extends BasePaginationDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;
}
