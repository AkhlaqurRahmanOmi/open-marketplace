// src/catalog/dtos/create-complete-product.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { OmitType } from '@nestjs/mapped-types';
import { CreateVariantDto } from './create-variant.dto';
import { CreateProductOptionDto } from './create-product-option.dto';
import { CreateProductImageDto } from './create-product-image.dto';

class CompleteProductOptionDto extends OmitType(CreateProductOptionDto, ['productId']) {}
class CompleteProductVariantDto extends OmitType(CreateVariantDto, ['productId']) {}
class CompleteProductImageDto extends OmitType(CreateProductImageDto, ['productId']) {}

export class CreateCompleteProductDto {
  @ValidateNested()
  @Type(() => CreateProductDto)
  product: CreateProductDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CompleteProductOptionDto)
  options?: CompleteProductOptionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CompleteProductVariantDto)
  variants?: CompleteProductVariantDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CompleteProductImageDto)
  images?: CompleteProductImageDto[];
}
