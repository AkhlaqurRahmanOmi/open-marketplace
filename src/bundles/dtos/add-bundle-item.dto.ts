import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class AddBundleItemDto {
  @IsNumber()
  @IsNotEmpty()
  variantId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}
