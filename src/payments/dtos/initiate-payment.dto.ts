import { IsNumber, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum PaymentGateway {
  PESAPAL = 'pesapal',
  MPESA = 'mpesa',
}

export class InitiatePaymentDto {
  @IsNumber()
  orderId: number;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsObject()
  @IsOptional()
  metadata?: {
    phoneNumber?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    description?: string;
    [key: string]: any;
  };
}
