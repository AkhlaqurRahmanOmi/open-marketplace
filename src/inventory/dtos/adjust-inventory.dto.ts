import { IsInt, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export enum InventoryAdjustmentReason {
  PURCHASE = 'purchase',
  SALE = 'sale',
  RETURN = 'return',
  DAMAGE = 'damage',
  LOSS = 'loss',
  FOUND = 'found',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

export class AdjustInventoryDto {
  @IsInt()
  @IsNotEmpty()
  variantId: number;

  @IsInt()
  @IsNotEmpty()
  locationId: number;

  @IsInt()
  @IsNotEmpty()
  delta: number; // Positive = increase, Negative = decrease

  @IsEnum(InventoryAdjustmentReason)
  @IsNotEmpty()
  reason: InventoryAdjustmentReason;

  @IsInt()
  @IsOptional()
  orderId?: number;

  @IsString()
  @IsOptional()
  note?: string;
}
