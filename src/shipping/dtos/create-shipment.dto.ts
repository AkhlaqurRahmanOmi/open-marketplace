import { IsInt, IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ShipmentStatus } from '@prisma/client';

export class CreateFulfillmentItemDto {
  @IsInt()
  orderItemId: number;

  @IsInt()
  quantity: number;
}

export class CreateShipmentDto {
  @IsInt()
  orderId: number;

  @IsInt()
  organizationId: number;

  @IsOptional()
  @IsInt()
  fromLocationId?: number;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFulfillmentItemDto)
  fulfillmentItems: CreateFulfillmentItemDto[];
}
