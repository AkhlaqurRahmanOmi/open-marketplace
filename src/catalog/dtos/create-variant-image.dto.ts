import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVariantImageDto {
  @IsNumber()
  @IsNotEmpty()
  variantId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  imageUrl: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  altText?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  position?: number;
}
