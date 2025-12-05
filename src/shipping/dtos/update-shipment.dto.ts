import { IsInt, IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateShipmentDto {
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

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  shippedAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deliveredAt?: Date;
}
