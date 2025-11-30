import { IsString, IsOptional, IsObject } from 'class-validator';

export class PaymentCallbackDto {
  @IsString()
  transactionId: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
