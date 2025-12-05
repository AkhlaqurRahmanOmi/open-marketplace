import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum AttributeDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  DATE = 'date',
}

export class AttributeOptionDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  label: string;
}

export class CreateAttributeDefinitionDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AttributeDataType)
  dataType: AttributeDataType;

  @IsBoolean()
  isRequired: boolean;

  @IsNumber()
  @IsOptional()
  minValue?: number;

  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minLength?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxLength?: number;

  @IsString()
  @IsOptional()
  pattern?: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsArray()
  @IsString({ each: true })
  organizationTypes: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeOptionDto)
  @IsOptional()
  options?: AttributeOptionDto[];
}
