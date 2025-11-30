import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductImageDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

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

  @IsBoolean()
  @IsOptional()
  isMain?: boolean;
}
