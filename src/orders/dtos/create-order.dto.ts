import { IsNumber, IsArray, ValidateNested, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentGateway } from '../../payments/dtos/initiate-payment.dto';

class OrderItemDto {
  @IsNumber()
  variantId?: number;

  @IsNumber()
  @IsOptional()
  bundleId?: number;

  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsNumber()
  userId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @IsOptional()
  billingAddressId?: number;

  @IsNumber()
  @IsOptional()
  shippingAddressId?: number;

  @IsNumber()
  @IsOptional()
  shippingMethodId?: number;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsEnum(PaymentGateway)
  @IsOptional()
  paymentGateway?: PaymentGateway;
}
