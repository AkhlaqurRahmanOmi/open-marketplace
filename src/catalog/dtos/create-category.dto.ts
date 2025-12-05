import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength, IsEnum, Min, ValidateIf } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  slug: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsOptional()
  @IsEnum(['percentage', 'fixed'], { message: 'feeType must be either percentage or fixed' })
  feeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'feeAmount must be a positive number' })
  @ValidateIf((o) => o.feeType !== undefined)
  feeAmount?: number;
}
