import {
  IsInt,
  IsOptional,
  IsPositive,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';

export class AddToCartDto {
  @ValidateIf((o) => !o.bundleId)
  @IsInt()
  @IsNotEmpty({ message: 'Either variantId or bundleId must be provided' })
  variantId?: number;

  @ValidateIf((o) => !o.variantId)
  @IsInt()
  // @IsNotEmpty({ message: 'Either variantId or bundleId must be provided' })
  bundleId?: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;
}
