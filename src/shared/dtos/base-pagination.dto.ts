import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base DTO for pagination parameters
 * Extend this class in your filter DTOs to include pagination
 *
 * @example
 * export class UserFilterDto extends BasePaginationDto {
 *   @IsOptional()
 *   @IsString()
 *   search?: string;
 * }
 */
export class BasePaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
