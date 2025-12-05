import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RefundItemDto {
  @IsInt()
  @IsPositive()
  orderItemId: number;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  amount: number;
}

export class CreateRefundDto {
  @IsInt()
  @IsPositive()
  orderId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items: RefundItemDto[];

  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
