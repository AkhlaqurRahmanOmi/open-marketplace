import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ShippingMethodType } from '@prisma/client';

export class CreateShippingMethodDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsEnum(ShippingMethodType)
  type: ShippingMethodType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freeThreshold?: number;

  @IsNumber()
  @Min(0)
  minDays: number;

  @IsNumber()
  @Min(0)
  maxDays: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
