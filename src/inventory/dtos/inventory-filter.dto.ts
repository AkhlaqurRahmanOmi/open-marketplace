import { IsInt, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BasePaginationDto } from '../../shared/dtos';

export enum InventoryMovementReason {
  PURCHASE = 'purchase',
  SALE = 'sale',
  RETURN = 'return',
  DAMAGE = 'damage',
  LOSS = 'loss',
  FOUND = 'found',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

export class InventoryFilterDto extends BasePaginationDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  variantId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  locationId?: number;
}

export class MovementFilterDto extends BasePaginationDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  variantId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  locationId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  orderId?: number;

  @IsEnum(InventoryMovementReason)
  @IsOptional()
  reason?: InventoryMovementReason;
}
