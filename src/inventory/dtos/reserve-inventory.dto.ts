import { IsInt, IsNotEmpty, IsPositive, IsOptional } from 'class-validator';

export class ReserveInventoryDto {
  @IsInt()
  @IsNotEmpty()
  variantId: number;

  @IsInt()
  @IsNotEmpty()
  locationId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @IsInt()
  @IsOptional()
  orderId?: number;
}

export class ReleaseInventoryDto {
  @IsInt()
  @IsNotEmpty()
  variantId: number;

  @IsInt()
  @IsNotEmpty()
  locationId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @IsInt()
  @IsOptional()
  orderId?: number;
}
