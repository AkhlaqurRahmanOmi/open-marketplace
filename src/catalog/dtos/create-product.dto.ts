import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

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
}
