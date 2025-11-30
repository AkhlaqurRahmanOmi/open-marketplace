import { IsInt, IsNotEmpty, IsPositive, IsOptional, IsString } from 'class-validator';

export class TransferInventoryDto {
  @IsInt()
  @IsNotEmpty()
  variantId: number;

  @IsInt()
  @IsNotEmpty()
  fromLocationId: number;

  @IsInt()
  @IsNotEmpty()
  toLocationId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
}
