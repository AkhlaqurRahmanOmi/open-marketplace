import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, IsEnum, IsNumber, Min, ValidateIf } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  seoTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  seoDescription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  seoKeywords?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  seoSlug?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['percentage', 'fixed'], { message: 'feeType must be either percentage or fixed' })
  feeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'feeAmount must be a positive number' })
  @ValidateIf((o) => o.feeType !== undefined)
  feeAmount?: number;
}
